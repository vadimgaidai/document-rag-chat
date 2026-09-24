import { z } from "zod"

// Shared by the API routes, the browser and the eval tooling. Bundled into the
// client, so nothing but zod may be imported here.

export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const MAX_FILES = 5
export const ALLOWED_EXTENSION = ".md"
export const UPLOAD_CONTENT_TYPE = "text/markdown"
export const UPLOAD_URL_TTL_SECONDS = 300

export const PROCESSING_STALE_AFTER_MS = 2 * 900_000

const MAX_NAME_LENGTH = 255

export const DOCUMENT_STATUS = {
  processing: "processing",
  ready: "ready",
  failed: "failed",
} as const

export const API_ERROR_CODE = {
  invalidType: "invalid_type",
  tooLarge: "too_large",
  limitReached: "limit_reached",
  invalidRequest: "invalid_request",
  notFound: "not_found",
  internal: "internal",
} as const

export const uploadRequestInputSchema = z.object({
  name: z.string(),
  sizeBytes: z.number().int().nonnegative(),
})

export const uploadRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(MAX_NAME_LENGTH)
    .refine((name) => name.toLowerCase().endsWith(ALLOWED_EXTENSION), {
      error: `The file name must end with ${ALLOWED_EXTENSION}.`,
    })
    .refine((name) => !name.includes("/") && !name.includes("\\"), {
      error: "The file name must not contain a path separator.",
    }),
  sizeBytes: z.number().int().positive().max(MAX_FILE_BYTES),
})

export const documentStatusValueSchema = z.enum(DOCUMENT_STATUS)

export const documentSchema = z.object({
  fileId: z.uuid(),
  name: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  uploadedAt: z.iso.datetime(),
  status: documentStatusValueSchema,
  chunkCount: z.number().int().optional(),
  readyAt: z.iso.datetime().optional(),
  failedAt: z.iso.datetime().optional(),
  reason: z.string().optional(),
})

export const DOCUMENTS_PAGE_SIZE = 20

export const documentListRequestSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(DOCUMENTS_PAGE_SIZE),
})

export const documentListResponseSchema = z.object({
  documents: z.array(documentSchema),
  nextCursor: z.string().nullable(),
})

export const presignedPostSchema = z.object({
  url: z.url(),
  fields: z.record(z.string(), z.string()),
})

export const uploadResponseSchema = z.object({
  fileId: z.uuid(),
  upload: presignedPostSchema,
})

export const apiErrorCodeSchema = z.enum(API_ERROR_CODE)

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string(),
})

export type TUploadRequest = z.infer<typeof uploadRequestSchema>
export type TDocumentListRequest = z.infer<typeof documentListRequestSchema>
export type TDocumentStatusValue = z.infer<typeof documentStatusValueSchema>
export type TDocument = z.infer<typeof documentSchema>
export type TDocumentListResponse = z.infer<typeof documentListResponseSchema>
export type TPresignedPost = z.infer<typeof presignedPostSchema>
export type TUploadResponse = z.infer<typeof uploadResponseSchema>
export type TApiErrorCode = z.infer<typeof apiErrorCodeSchema>
export type TApiError = z.infer<typeof apiErrorSchema>
