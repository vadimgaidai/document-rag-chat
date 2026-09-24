import {
  INDEX_PREFIX,
  ORIGINAL_EXTENSION,
  ORIGINALS_PREFIX,
  STATUS_PREFIX,
  TIMESTAMP_CEILING,
  TIMESTAMP_DIGITS,
} from "./documents.constants"

export const originalKey = (fileId: string) => `${ORIGINALS_PREFIX}${fileId}${ORIGINAL_EXTENSION}`

export const chunksKey = (fileId: string) => `${INDEX_PREFIX}${fileId}/chunks.jsonl`

export const statusKey = (fileId: string, uploadedAt: string) => {
  const inverted = TIMESTAMP_CEILING - Date.parse(uploadedAt)
  return `${STATUS_PREFIX}${String(inverted).padStart(TIMESTAMP_DIGITS, "0")}-${fileId}.json`
}

export const fileIdFromOriginalKey = (key: string): string | null => {
  if (!key.startsWith(ORIGINALS_PREFIX) || !key.endsWith(ORIGINAL_EXTENSION)) {
    return null
  }

  const fileId = key.slice(ORIGINALS_PREFIX.length, -ORIGINAL_EXTENSION.length)

  return fileId.length > 0 && !fileId.includes("/") ? fileId : null
}
