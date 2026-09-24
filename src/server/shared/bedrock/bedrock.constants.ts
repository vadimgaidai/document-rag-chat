/** The dimension the S3 Vectors index was created with; Titan is asked to match it. */
export const EMBEDDING_DIMENSIONS = 1024

/** Two retries, then the error escapes and SQS re-runs the whole document. */
export const RETRY_DELAYS_MS = [200, 800]
export const RETRY_JITTER_MS = 100

export const DEFAULT_CONCURRENCY = 8
