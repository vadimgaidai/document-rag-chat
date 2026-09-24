import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  paginateListObjectsV2,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3"
import { createPresignedPost } from "@aws-sdk/s3-presigned-post"

import type { TPresignedPost } from "@/contracts"
import type { ConfigService } from "@/server/shared/config/config.service"

import { NOT_FOUND_STATUS, PRECONDITION_STATUS } from "./s3.constants"

import type {
  TKeyPage,
  TListPageOptions,
  TPutJsonOptions,
  TPutResult,
  TStoredJson,
  TUploadFormOptions,
} from "./s3.types"
import type { z } from "zod"

const statusOf = (error: unknown) =>
  error instanceof S3ServiceException ? error.$metadata.httpStatusCode : undefined

const isLostConditionalWrite = (status: number | undefined, options: TPutJsonOptions) =>
  status !== undefined &&
  (PRECONDITION_STATUS.includes(status) ||
    (status === NOT_FOUND_STATUS && options.ifMatch !== undefined))

export class S3Service {
  private readonly client: S3Client

  constructor(private readonly config: ConfigService) {
    this.client = new S3Client({ region: config.region })
  }

  private get bucket() {
    return this.config.documentsBucket
  }

  async headMetadata(key: string): Promise<Record<string, string> | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      )
      return response.Metadata ?? {}
    } catch (error) {
      if (statusOf(error) === NOT_FOUND_STATUS) {
        return null
      }
      throw error
    }
  }

  async getText(key: string): Promise<string | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      )
      return (await response.Body?.transformToString()) ?? null
    } catch (error) {
      if (statusOf(error) === NOT_FOUND_STATUS) {
        return null
      }
      throw error
    }
  }

  async getJson<TSchema extends z.ZodType>(
    key: string,
    schema: TSchema,
  ): Promise<TStoredJson<z.infer<TSchema>> | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      )
      if (!response.Body) {
        return null
      }
      return {
        value: schema.parse(JSON.parse(await response.Body.transformToString())),
        etag: response.ETag ?? "",
      }
    } catch (error) {
      if (statusOf(error) === NOT_FOUND_STATUS) {
        return null
      }
      throw error
    }
  }

  async putBytes(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    )
  }

  async putJson(key: string, value: unknown, options: TPutJsonOptions = {}): Promise<TPutResult> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: JSON.stringify(value),
          ContentType: "application/json",
          IfMatch: options.ifMatch,
          IfNoneMatch: options.ifNoneMatch,
        }),
      )
      return "ok"
    } catch (error) {
      if (isLostConditionalWrite(statusOf(error), options)) {
        return "precondition-failed"
      }
      throw error
    }
  }

  createUploadForm(key: string, options: TUploadFormOptions): Promise<TPresignedPost> {
    const metadataFields = Object.fromEntries(
      Object.entries(options.metadata ?? {}).map(([name, value]) => [`x-amz-meta-${name}`, value]),
    )

    return createPresignedPost(this.client, {
      Bucket: this.bucket,
      Key: key,
      Fields: { "Content-Type": options.contentType, ...metadataFields },
      Conditions: [
        ["eq", "$key", key],
        ["eq", "$Content-Type", options.contentType],
        ...Object.entries(metadataFields).map(([name, value]) => ({ [name]: value })),
        ["content-length-range", 1, options.maxBytes],
      ],
      Expires: options.expiresIn,
    })
  }

  async listPage(prefix: string, options: TListPageOptions): Promise<TKeyPage> {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: options.limit,
        ContinuationToken: options.cursor,
      }),
    )

    return {
      keys: (response.Contents ?? []).flatMap((object) => (object.Key ? [object.Key] : [])),
      nextCursor: response.NextContinuationToken ?? null,
    }
  }

  async countKeys(prefix: string): Promise<number> {
    let total = 0
    for await (const page of paginateListObjectsV2(
      { client: this.client },
      { Bucket: this.bucket, Prefix: prefix },
    )) {
      total += page.KeyCount ?? 0
    }
    return total
  }
}
