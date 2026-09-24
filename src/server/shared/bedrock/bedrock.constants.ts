export const EMBEDDING_DIMENSIONS = 1024

/**
 * Titan v2 on-demand quota in eu-central-1, account-wide and not adjustable:
 * 600 requests/min and 300 000 tokens/min. Nine starts per second stay ~10%
 * under the request cap and, at the ~450 tokens a chunk averages, near
 * 240k tokens/min
 */
export const EMBED_REQUESTS_PER_SECOND = 9
export const EMBED_RATE_INTERVAL_MS = 1000

export const EMBED_MAX_ATTEMPTS = 8

export const DEFAULT_CONCURRENCY = 8

// A question waits on this call, so a throttled rerank is retried once and then
// gives up rather than holding the request open.
export const RERANK_MAX_ATTEMPTS = 2
