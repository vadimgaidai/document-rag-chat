export type TEmbeddings = {
  embeddings: number[][]
  /** Summed across the batch; 0 when Titan does not report it. */
  inputTokens: number
}

export type TEmbedOptions = {
  concurrency?: number
}
