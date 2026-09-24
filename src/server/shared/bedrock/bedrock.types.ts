export type TEmbeddings = {
  embeddings: number[][]
  /** Summed across the batch; 0 when Titan does not report it. */
  inputTokens: number
}

export type TEmbedOptions = {
  concurrency?: number
}

export type TRerankDocument = {
  id: string
  text: string
}

export type TRerankScore = {
  id: string
  /** Cohere Rerank relevance, 0..1. */
  score: number
}
