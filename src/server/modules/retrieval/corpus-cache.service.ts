import { DOCUMENT_STATUS, documentSchema } from "@/contracts"
import type { TDocument } from "@/contracts"
import { STATUS_PREFIX } from "@/server/modules/documents/documents.constants"
import { chunksKey } from "@/server/modules/documents/documents.keys"
import { parseChunks } from "@/server/modules/ingestion/chunker/chunks-file"
import type { S3Service } from "@/server/shared/s3/s3.service"
import type { TKeyEtag } from "@/server/shared/s3/s3.types"
import { log } from "@/server/shared/utils/log"

import { buildIndex, statusFingerprint } from "./retrieval.helpers"

import type { TChunkRecord, TCorpus } from "./retrieval.types"

export class CorpusCacheService {
  private cache: TCorpus | null = null

  constructor(private readonly s3: S3Service) {}

  async get(): Promise<TCorpus> {
    const startedAt = Date.now()
    const objects = await this.s3.listWithEtags(STATUS_PREFIX)
    const fingerprint = statusFingerprint(objects)

    if (this.cache?.fingerprint === fingerprint) {
      log({ stage: "corpus", cache: "hit", files: this.cache.readyFileIds.size })
      return this.cache
    }

    const documents = await this.readReadyDocuments(objects)
    const records = await this.readChunks(documents)

    this.cache = {
      fingerprint,
      records,
      readyFileIds: new Set(documents.map((document) => document.fileId)),
      index: buildIndex(records.values()),
    }

    log({
      stage: "corpus",
      cache: "reload",
      ms: Date.now() - startedAt,
      files: this.cache.readyFileIds.size,
      chunks: records.size,
    })

    return this.cache
  }

  private async readReadyDocuments(objects: readonly TKeyEtag[]): Promise<TDocument[]> {
    const stored = await Promise.all(
      objects.map(async ({ key }) => {
        try {
          return await this.s3.getJson(key, documentSchema)
        } catch (error) {
          console.error(`[retrieval] unreadable status object ${key}`, error)
          return null
        }
      }),
    )

    return stored.flatMap((entry) =>
      entry && entry.value.status === DOCUMENT_STATUS.ready ? [entry.value] : [],
    )
  }

  private async readChunks(documents: readonly TDocument[]): Promise<Map<string, TChunkRecord>> {
    const files = await Promise.all(
      documents.map(async (document) => {
        const text = await this.s3.getText(chunksKey(document.fileId))

        if (text === null) {
          // A `ready` document always has its chunks file; losing one must not
          // take the rest of the corpus down.
          console.error(`[retrieval] ${document.fileId} is ready without a chunks file`)
          return []
        }

        return parseChunks(text).map((chunk) => ({ ...chunk, fileName: document.name }))
      }),
    )

    return new Map(files.flat().map((record) => [record.chunkId, record]))
  }
}
