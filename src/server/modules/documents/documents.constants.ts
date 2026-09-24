export const STATUS_PREFIX = "status/"
export const ORIGINALS_PREFIX = "originals/"
export const INDEX_PREFIX = "index/"
export const ORIGINAL_EXTENSION = ".md"

export const STATUS_KEY_METADATA = "status-key"

// Subtracting the upload time from a fixed ceiling puts the newest documents
// first in S3's own lexicographic key order.
export const TIMESTAMP_CEILING = 9_999_999_999_999
export const TIMESTAMP_DIGITS = 13

export const FAILURE_REASON = {
  noIndexableText:
    "document contains no indexable text (the file is empty or contains only whitespace)",
  retriesExhausted: "processing failed after 3 attempts",
} as const
