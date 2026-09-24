import type { BedrockService } from "@/server/shared/bedrock/bedrock.service"
import type { S3VectorsService } from "@/server/shared/s3-vectors/s3-vectors.service"
import { log } from "@/server/shared/utils/log"

import { BM25_TOP_K, RERANK_MAX_DOCS, VECTOR_TOP_K } from "./retrieval.constants"
import { rrf, search, selectEvidence } from "./retrieval.helpers"

import type { CorpusCacheService } from "./corpus-cache.service"
import type { TCorpus, TEvidence } from "./retrieval.types"

export class RetrievalService {
  constructor(
    private readonly corpus: CorpusCacheService,
    private readonly bedrock: BedrockService,
    private readonly vectors: S3VectorsService,
  ) {}

  async retrieve(question: string): Promise<TEvidence[]> {
    const startedAt = Date.now()

    const corpus = await this.corpus.get()
    if (corpus.readyFileIds.size === 0) {
      log({
        stage: "retrieve",
        ms: Date.now() - startedAt,
        vectorHits: 0,
        bm25Hits: 0,
        selected: 0,
      })
      return []
    }

    const bm25Ids = search(corpus.index, question, BM25_TOP_K)
    const vectorIds = await this.queryVectors(question, corpus)

    const candidates = rrf([vectorIds, bm25Ids])
      .slice(0, RERANK_MAX_DOCS)
      .flatMap(({ id }) => corpus.records.get(id) ?? [])

    const scores = await this.bedrock.rerank(
      question,
      candidates.map(({ chunkId, text }) => ({ id: chunkId, text })),
    )

    const evidence = selectEvidence(
      scores.flatMap(({ id, score }) => {
        const record = corpus.records.get(id)
        return record ? [{ record, score }] : []
      }),
    )

    log({
      stage: "retrieve",
      ms: Date.now() - startedAt,
      vectorHits: vectorIds.length,
      bm25Hits: bm25Ids.length,
      fused: candidates.length,
      selected: evidence.length,
    })

    return evidence
  }

  private async queryVectors(question: string, corpus: TCorpus): Promise<string[]> {
    const embedding = await this.bedrock.embedQuery(question)

    const matches = await this.vectors.query(embedding, {
      topK: VECTOR_TOP_K,
      filter: { fileId: { $in: [...corpus.readyFileIds] } },
    })

    const known = matches.filter((match) => corpus.records.has(match.key))
    if (known.length !== matches.length) {
      log({ stage: "retrieve", unknownVectorKeys: matches.length - known.length })
    }

    return known.map((match) => match.key)
  }
}
