export const DOCUMENTS_ENTITY = "documents"

export const DOCUMENTS_QUERY_KEYS = {
  LIST: "list",
} as const

export const PROCESSING_POLL_INTERVAL_MS = 30_000

export const UPLOAD_ITEM_STATE = {
  queued: "queued",
  uploading: "uploading",
  failed: "failed",
} as const
