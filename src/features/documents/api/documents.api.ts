import queryString from "query-string"

import {
  contextResponseSchema,
  documentDeleteResponseSchema,
  documentListResponseSchema,
  uploadResponseSchema,
} from "@/contracts"
import type {
  TContextResponse,
  TDocumentDeleteResponse,
  TDocumentListResponse,
  TPresignedPost,
  TUploadRequest,
  TUploadResponse,
} from "@/contracts"
import { ApiError, apiFetch } from "@/lib/api/client"

const PERCENT = 100

export const documentsApi = {
  list: (
    query: { cursor?: string; limit?: number },
    signal?: AbortSignal,
  ): Promise<TDocumentListResponse> =>
    apiFetch(
      documentListResponseSchema,
      queryString.stringifyUrl({ url: "/api/files", query }, { skipNull: true }),
      { signal },
    ),

  context: (
    fileId: string,
    query: { from: number; to: number },
    signal?: AbortSignal,
  ): Promise<TContextResponse> =>
    apiFetch(
      contextResponseSchema,
      queryString.stringifyUrl({ url: `/api/files/${fileId}/context`, query }),
      { signal },
    ),

  createUpload: (request: TUploadRequest): Promise<TUploadResponse> =>
    apiFetch(uploadResponseSchema, "/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }),

  remove: (fileId: string): Promise<TDocumentDeleteResponse> =>
    apiFetch(documentDeleteResponseSchema, `/api/files/${fileId}`, { method: "DELETE" }),

  postToBucket: (upload: TPresignedPost, file: File, onProgress?: (percent: number) => void) =>
    new Promise<void>((resolve, reject) => {
      const form = new FormData()
      for (const [field, value] of Object.entries(upload.fields)) {
        form.append(field, value)
      }
      form.append("file", file)

      const request = new XMLHttpRequest()
      request.open("POST", upload.url)

      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress?.(Math.round((event.loaded / event.total) * PERCENT))
        }
      })

      request.addEventListener("load", () => {
        if (request.status >= 200 && request.status < 300) {
          resolve()
          return
        }

        reject(new ApiError(request.status, "unknown", "The bucket rejected the upload."))
      })

      request.addEventListener("error", () => {
        reject(new ApiError(0, "unknown", "The upload could not reach the bucket."))
      })

      request.send(form)
    }),
}
