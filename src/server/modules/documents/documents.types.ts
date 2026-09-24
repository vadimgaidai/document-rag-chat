import type { API_ERROR_CODE, DOCUMENT_STATUS, TDocument, TUploadResponse } from "@/contracts"
import type { TPutResult } from "@/server/shared/s3/s3.types"

export type TStoredStatus = {
  document: TDocument
  etag: string
  key: string
}

export type TStatusTransition =
  | { status: typeof DOCUMENT_STATUS.ready; chunkCount: number; readyAt: string }
  | { status: typeof DOCUMENT_STATUS.failed; reason: string; failedAt: string }

export type TDocumentPage = {
  documents: TDocument[]
  nextCursor: string | null
}

export type TCreateUploadResult =
  | { ok: true; response: TUploadResponse }
  | { ok: false; code: typeof API_ERROR_CODE.limitReached; message: string }

/** `noop`: the document was not `processing`, so there was nothing to fail. */
export type TFailOutcome = TPutResult | "noop"

/** `not-found`: neither a status object nor an original exists for the file id. */
export type TRemoveOutcome = "deleted" | "not-found"
