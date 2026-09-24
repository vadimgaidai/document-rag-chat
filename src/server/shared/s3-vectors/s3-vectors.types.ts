export type TVectorRecord = {
  key: string
  embedding: number[]
  metadata: { fileId: string; seq: number }
}

export type TVectorFilter = { fileId: { $in: string[] } }

export type TQueryOptions = {
  topK: number
  filter?: TVectorFilter
}

export type TVectorMatch = {
  key: string
  /** `null` when the index does not report one. */
  distance: number | null
}
