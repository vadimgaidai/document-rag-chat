import type { TChunk } from "@/server/modules/ingestion/chunker/chunker.types"

import type MiniSearch from "minisearch"

export type TChunkRecord = TChunk & { fileName: string }

export type TChunkIndex = MiniSearch<TChunkRecord>

export type TEvidence = TChunkRecord & { marker: string; score: number }

export type TScoredChunk = { record: TChunkRecord; score: number }

export type TCorpus = {
  fingerprint: string
  records: Map<string, TChunkRecord>
  readyFileIds: Set<string>
  index: TChunkIndex
}
