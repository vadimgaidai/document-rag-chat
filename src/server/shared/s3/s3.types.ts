export type TPutResult = "ok" | "precondition-failed"

export type TStoredJson<T> = {
  value: T
  etag: string
}

export type TPutJsonOptions = {
  ifMatch?: string
  ifNoneMatch?: "*"
}

export type TUploadFormOptions = {
  contentType: string
  maxBytes: number
  expiresIn: number
  metadata?: Record<string, string>
}

export type TListPageOptions = {
  limit: number
  cursor?: string
}

export type TKeyPage = {
  keys: string[]
  nextCursor: string | null
}
