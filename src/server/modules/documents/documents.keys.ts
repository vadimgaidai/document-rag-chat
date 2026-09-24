import {
  INDEX_PREFIX,
  ORIGINAL_EXTENSION,
  ORIGINALS_PREFIX,
  STATUS_EXTENSION,
  STATUS_PREFIX,
  TIMESTAMP_CEILING,
  TIMESTAMP_DIGITS,
} from "./documents.constants"

export const originalKey = (fileId: string) => `${ORIGINALS_PREFIX}${fileId}${ORIGINAL_EXTENSION}`

export const chunksKey = (fileId: string) => `${INDEX_PREFIX}${fileId}/chunks.jsonl`

export const statusKey = (fileId: string, uploadedAt: string) => {
  const inverted = TIMESTAMP_CEILING - Date.parse(uploadedAt)
  const timestamp = String(inverted).padStart(TIMESTAMP_DIGITS, "0")
  return `${STATUS_PREFIX}${timestamp}-${fileId}${STATUS_EXTENSION}`
}

export const isStatusKeyOf = (key: string, fileId: string) => {
  if (!key.startsWith(STATUS_PREFIX)) {
    return false
  }

  const suffix = key.slice(STATUS_PREFIX.length + TIMESTAMP_DIGITS)
  return suffix === `-${fileId}${STATUS_EXTENSION}`
}

export const fileIdFromOriginalKey = (key: string): string | null => {
  if (!key.startsWith(ORIGINALS_PREFIX) || !key.endsWith(ORIGINAL_EXTENSION)) {
    return null
  }

  const fileId = key.slice(ORIGINALS_PREFIX.length, -ORIGINAL_EXTENSION.length)

  return fileId.length > 0 && !fileId.includes("/") ? fileId : null
}
