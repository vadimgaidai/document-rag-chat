import {
  API_ERROR_CODE,
  DOCUMENT_STATUS,
  documentSchema,
  MAX_LIBRARY_FILES,
  UPLOAD_CONTENT_TYPE,
  UPLOAD_URL_TTL_SECONDS,
} from "@/contracts"
import type {
  TContextQuery,
  TContextResponse,
  TDocument,
  TDocumentListRequest,
  TUploadRequest,
} from "@/contracts"
import { normalizeNewlines } from "@/server/modules/ingestion/chunker/chunker"
import type { S3Service } from "@/server/shared/s3/s3.service"
import type { TPutResult } from "@/server/shared/s3/s3.types"

import { STATUS_KEY_METADATA, STATUS_PREFIX } from "./documents.constants"
import { originalKey, statusKey } from "./documents.keys"

import type {
  TCreateUploadResult,
  TDocumentPage,
  TFailOutcome,
  TStatusTransition,
  TStoredStatus,
} from "./documents.types"

export class DocumentsService {
  constructor(private readonly s3: S3Service) {}

  async createUpload({ name, sizeBytes }: TUploadRequest): Promise<TCreateUploadResult> {
    if ((await this.s3.countKeys(STATUS_PREFIX)) >= MAX_LIBRARY_FILES) {
      return {
        ok: false,
        code: API_ERROR_CODE.limitReached,
        message: `The library already holds ${String(MAX_LIBRARY_FILES)} documents.`,
      }
    }

    const fileId = crypto.randomUUID()
    const { key: statusObjectKey } = await this.createProcessingStatus({
      fileId,
      name,
      sizeBytes,
      uploadedAt: new Date().toISOString(),
    })

    const upload = await this.s3.createUploadForm(originalKey(fileId), {
      contentType: UPLOAD_CONTENT_TYPE,
      maxBytes: sizeBytes,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      metadata: { [STATUS_KEY_METADATA]: statusObjectKey },
    })

    return { ok: true, response: { fileId, upload } }
  }

  async list({ cursor, limit }: TDocumentListRequest): Promise<TDocumentPage> {
    const page = await this.s3.listPage(STATUS_PREFIX, { limit, cursor })

    const stored = await Promise.all(
      page.keys.map(async (key) => {
        try {
          return await this.s3.getJson(key, documentSchema)
        } catch (error) {
          // One status object written in an older shape must not take the whole
          // page down.
          console.error(`[documents] unreadable status object ${key}`, error)
          return null
        }
      }),
    )

    return {
      documents: stored.flatMap((entry) => (entry ? [entry.value] : [])),
      nextCursor: page.nextCursor,
    }
  }

  async readStatus(key: string): Promise<TStoredStatus | null> {
    const stored = await this.s3.getJson(key, documentSchema)
    return stored && { document: stored.value, etag: stored.etag, key }
  }

  async readStatusOfFile(fileId: string): Promise<TStoredStatus | null> {
    const metadata = await this.s3.headMetadata(originalKey(fileId))
    const key = metadata?.[STATUS_KEY_METADATA]

    return key ? this.readStatus(key) : null
  }

  // The original is the ground truth a citation points at, so the window is
  // cut from it with the chunker's own newline normalization — line numbers
  // then match the ones the chunks carry.
  async readContext(
    fileId: string,
    { from, to, pad }: TContextQuery,
  ): Promise<TContextResponse | null> {
    const current = await this.readStatusOfFile(fileId)
    if (!current) {
      return null
    }

    const source = await this.s3.getText(originalKey(fileId))
    if (source === null) {
      return null
    }

    const lines = normalizeNewlines(source).split("\n")
    const start = Math.max(1, from - pad)
    const end = Math.min(lines.length, to + pad)

    return {
      fileId,
      name: current.document.name,
      firstLine: start,
      lines: lines.slice(start - 1, end),
      focus: { from, to: Math.min(to, lines.length) },
    }
  }

  transition(current: TStoredStatus, next: TStatusTransition): Promise<TPutResult> {
    return this.s3.putJson(current.key, { ...current.document, ...next }, { ifMatch: current.etag })
  }

  async failIfProcessing(fileId: string, reason: string): Promise<TFailOutcome> {
    const current = await this.readStatusOfFile(fileId)

    if (!current || current.document.status !== DOCUMENT_STATUS.processing) {
      return "noop"
    }

    return this.transition(current, {
      status: DOCUMENT_STATUS.failed,
      reason,
      failedAt: new Date().toISOString(),
    })
  }

  private async createProcessingStatus({
    fileId,
    name,
    sizeBytes,
    uploadedAt,
  }: {
    fileId: string
    name: string
    sizeBytes: number
    uploadedAt: string
  }): Promise<{ key: string; result: TPutResult }> {
    const document: TDocument = {
      fileId,
      name,
      sizeBytes,
      uploadedAt,
      status: DOCUMENT_STATUS.processing,
    }
    const key = statusKey(fileId, uploadedAt)

    const result = await this.s3.putJson(key, document, { ifNoneMatch: "*" })
    return { key, result }
  }
}
