import MiniSearch from "minisearch"

import type { TKeyEtag } from "@/server/shared/s3/s3.types"

import { EVIDENCE_MAX, RERANK_SCORE_FLOOR, RRF_K } from "./retrieval.constants"

import type { TChunkIndex, TChunkRecord, TEvidence, TScoredChunk } from "./retrieval.types"

export const buildIndex = (records: Iterable<TChunkRecord>): TChunkIndex => {
  const index: TChunkIndex = new MiniSearch({
    fields: ["text"],
    idField: "chunkId",
    storeFields: [],
    tokenize: (text) => text.split(/[^\p{L}\p{N}_-]+/u),
    processTerm: (term) =>
      [...new Set([term, ...term.split(/[-_]/)])].filter(Boolean).map((part) => part.toLowerCase()),
    searchOptions: { combineWith: "OR" },
  })

  index.addAll([...records])

  return index
}

export const search = (index: TChunkIndex, query: string, k: number): string[] =>
  index
    .search(query)
    .slice(0, k)
    .map((result) => String(result.id))

export const rrf = (rankings: readonly (readonly string[])[], k = RRF_K) => {
  const scores = new Map<string, number>()

  for (const ranking of rankings) {
    ranking.forEach((id, rank) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1)))
  }

  return [...scores].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score)
}

export const selectEvidence = (scored: readonly TScoredChunk[]): TEvidence[] =>
  scored
    .filter(({ score }) => score >= RERANK_SCORE_FLOOR)
    .slice(0, EVIDENCE_MAX)
    .map(({ record, score }, index) => ({ ...record, marker: `c${String(index + 1)}`, score }))

export const statusFingerprint = (objects: readonly TKeyEtag[]) =>
  objects
    .map(({ key, etag }) => `${key}@${etag}`)
    .sort()
    .join("|")
