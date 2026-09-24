import { DOCUMENT_STATUS } from "@/contracts"
import { FAILURE_REASON } from "@/server/modules/documents/documents.constants"
import { chunksKey, originalKey } from "@/server/modules/documents/documents.keys"
import type { DocumentsService } from "@/server/modules/documents/documents.service"
import type { TStoredStatus } from "@/server/modules/documents/documents.types"
import type { BedrockService } from "@/server/shared/bedrock/bedrock.service"
import type { S3Service } from "@/server/shared/s3/s3.service"
import type { S3VectorsService } from "@/server/shared/s3-vectors/s3-vectors.service"
import { log } from "@/server/shared/utils/log"

import { chunkMarkdown, normalizeNewlines } from "./chunker/chunker"
import { CHUNKS_CONTENT_TYPE } from "./chunker/chunker.constants"
import { serializeChunks } from "./chunker/chunks-file"
import { EMBED_CONCURRENCY, EMBED_GROUP_SIZE, HEADING_SEPARATOR } from "./ingestion.constants"

import type { TChunk } from "./chunker/chunker.types"
import type { TIngestOutcome } from "./ingestion.types"

const groupsOf = <T>(items: readonly T[], size: number): T[][] => {
  const groups: T[][] = []
  for (let start = 0; start < items.length; start += size) {
    groups.push(items.slice(start, start + size))
  }
  return groups
}

const embeddingInput = (chunk: TChunk) =>
  chunk.headingPath.length > 0
    ? `${chunk.headingPath.join(HEADING_SEPARATOR)}\n\n${chunk.text}`
    : chunk.text

export class IngestionService {
  constructor(
    private readonly s3: S3Service,
    private readonly bedrock: BedrockService,
    private readonly vectors: S3VectorsService,
    private readonly documents: DocumentsService,
  ) {}

  async ingest(fileId: string): Promise<TIngestOutcome> {
    const startedAt = Date.now()

    const current = await this.documents.readStatusOfFile(fileId)
    if (!current || current.document.status !== DOCUMENT_STATUS.processing) {
      log({ fileId, stage: "skipped", status: current?.document.status ?? null })
      return "skipped"
    }

    const source = await this.s3.getText(originalKey(fileId))
    if (source === null) {
      throw new Error(`${fileId}: the original is missing`)
    }

    const chunkedAt = Date.now()
    const chunks = await chunkMarkdown(normalizeNewlines(source), fileId)

    if (chunks.length === 0) {
      await this.documents.transition(current, {
        status: DOCUMENT_STATUS.failed,
        reason: FAILURE_REASON.noIndexableText,
        failedAt: new Date().toISOString(),
      })
      log({ fileId, stage: "failed", reason: FAILURE_REASON.noIndexableText })
      return "failed"
    }

    log({ fileId, stage: "chunked", ms: Date.now() - chunkedAt, count: chunks.length })

    const writtenAt = Date.now()
    await this.s3.putBytes(
      chunksKey(fileId),
      new TextEncoder().encode(serializeChunks(chunks)),
      CHUNKS_CONTENT_TYPE,
    )
    log({ fileId, stage: "chunks-written", ms: Date.now() - writtenAt, count: chunks.length })

    await this.embedAndStore(fileId, chunks)

    const result = await this.documents.transition(current, {
      status: DOCUMENT_STATUS.ready,
      chunkCount: chunks.length,
      readyAt: new Date().toISOString(),
    })

    const totalMs = Date.now() - startedAt

    if (result === "precondition-failed") {
      return this.settleLostRace(current, chunks, totalMs)
    }

    log({
      fileId,
      stage: "published",
      ms: totalMs,
      seconds: Math.round(totalMs / 1000),
      count: chunks.length,
    })
    return "published"
  }

  private async embedAndStore(fileId: string, chunks: readonly TChunk[]) {
    const startedAt = Date.now()
    const written = new Set<number>()
    let inputTokens = 0

    for (const group of groupsOf(chunks, EMBED_GROUP_SIZE)) {
      const result = await this.bedrock.embed(group.map(embeddingInput), {
        concurrency: EMBED_CONCURRENCY,
      })

      await this.vectors.put(
        group.map((chunk, index) => ({
          key: chunk.chunkId,
          embedding: result.embeddings[index],
          metadata: { fileId, seq: chunk.seq },
        })),
      )

      for (const chunk of group) {
        written.add(chunk.seq)
      }
      inputTokens += result.inputTokens
    }

    if (written.size !== chunks.length || chunks.some((chunk) => !written.has(chunk.seq))) {
      throw new Error(
        `${fileId}: embedded ${String(written.size)} of ${String(chunks.length)} chunks`,
      )
    }

    log({
      fileId,
      stage: "embedded",
      ms: Date.now() - startedAt,
      count: chunks.length,
      inputTokens,
    })
  }

  private async settleLostRace(
    current: TStoredStatus,
    chunks: readonly TChunk[],
    totalMs: number,
  ): Promise<TIngestOutcome> {
    const { fileId } = current.document

    const survivor = await this.documents.readStatus(current.key)
    if (survivor) {
      log({ fileId, stage: "lost-race", ms: totalMs })
      return "lost-race"
    }

    await this.vectors.delete(chunks.map((chunk) => chunk.chunkId))
    await this.s3.deleteObject(chunksKey(fileId))

    log({ fileId, stage: "cleaned", ms: totalMs, count: chunks.length })
    return "cleaned"
  }
}
