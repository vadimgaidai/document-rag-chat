export const DOCUMENTS_ENTITY = "documents"

export const DOCUMENTS_QUERY_KEYS = {
  LIST: "list",
} as const

export const PROCESSING_POLL_INTERVAL_MS = 5_000

/**
 * Where a queued file is in the two-step upload. There is no success state: a
 * file that lands leaves the queue, and the document table takes it from there.
 */
export const UPLOAD_ITEM_STATE = {
  queued: "queued",
  uploading: "uploading",
  failed: "failed",
} as const
