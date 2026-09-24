import { z } from "zod"

// Shared by the API routes, the browser and the eval tooling. Bundled into the
// client, so nothing but zod may be imported here.

export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const MAX_FILES_PER_UPLOAD = 5
export const MAX_LIBRARY_FILES = 30
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

export const documentDeleteResponseSchema = z.object({
  fileId: z.uuid(),
})

export const apiErrorCodeSchema = z.enum(API_ERROR_CODE)

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string(),
})

export const RAG_EVIDENCE_EVENT = "rag.evidence"
export const RAG_RESULT_EVENT = "rag.result"

export const CONFIDENCE = {
  supported: "supported",
  partiallySupported: "partially_supported",
  unsupported: "unsupported",
} as const

export const QUOTE_STATUS = {
  none: "none",
  verified: "verified",
  unverified: "unverified",
} as const

export const INTEGRITY_FLAG = {
  unknownMarkers: "unknown_markers",
  leakedEvidenceMarkup: "leaked_evidence_markup",
  emptyAnswer: "empty_answer",
} as const

export const sourceRefSchema = z.object({
  marker: z.string().regex(/^c\d+$/),
  chunkId: z.string(),
  fileId: z.uuid(),
  fileName: z.string(),
  headingPath: z.array(z.string()),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
})

export const confidenceSchema = z.enum(CONFIDENCE)
export const quoteStatusSchema = z.enum(QUOTE_STATUS)
export const integrityFlagSchema = z.enum(INTEGRITY_FLAG)

// Only a final citation carries a quote verdict: `rag.evidence` is sent before
// the answer exists, so there is nothing to verify against yet.
export const citationSchema = sourceRefSchema.extend({ quoteStatus: quoteStatusSchema })

// `[start, end)` into the assistant text. The server computes these once and
// the browser highlights by them — the text is never split twice.
export const claimSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  markers: z.array(z.string()),
  cited: z.boolean(),
})

export const ragEvidenceEventSchema = z.object({
  runId: z.string(),
  evidence: z.array(sourceRefSchema),
})

// Emitted once the whole answer is known and every post-generation check has
// run. `generated: false` is the no-evidence path: the model was never called.
export const ragResultEventSchema = z.object({
  runId: z.string(),
  generated: z.boolean(),
  abstained: z.boolean(),
  confidence: confidenceSchema,
  citations: z.array(citationSchema),
  claims: z.array(claimSchema),
  unknownMarkers: z.array(z.string()),
  quoteFailures: z.number().int().nonnegative(),
  flaggedMissingEvidence: z.boolean(),
  integrity: z.array(integrityFlagSchema),
})

// Spec §4 wording, sent verbatim by the server and looked for in model output.
export const ABSTENTION_TEXT = "I could not find sufficient support in the documents"

export const MAX_CHAT_BODY_BYTES = 256 * 1024
export const MAX_QUESTION_CHARS = 4_000
export const MAX_HISTORY_CHARS = 24_000

export const CONTEXT_PAD_DEFAULT_LINES = 8
export const CONTEXT_PAD_MAX_LINES = 50

// No maximum range: any range a citation can carry is servable in one response.
export const contextQuerySchema = z
  .object({
    from: z.coerce.number().int().positive(),
    to: z.coerce.number().int().positive(),
    pad: z.coerce
      .number()
      .int()
      .min(0)
      .max(CONTEXT_PAD_MAX_LINES)
      .default(CONTEXT_PAD_DEFAULT_LINES),
  })
  .refine((query) => query.to >= query.from, { error: "`to` must not be before `from`." })

export const contextResponseSchema = z.object({
  fileId: z.uuid(),
  name: z.string(),
  firstLine: z.number().int().positive(),
  lines: z.array(z.string()),
  focus: z.object({
    from: z.number().int().positive(),
    to: z.number().int().positive(),
  }),
})

// One element of the AG-UI `usage[]` array on RUN_FINISHED. The engine
// normalises its own TokenUsage into this shape before the chunk reaches the
// wire, so these are the field names the browser sees.
export const usageSchema = z
  .object({
    inputTokens: z.number().int(),
    outputTokens: z.number().int(),
  })
  .partial()

export type TUploadRequest = z.infer<typeof uploadRequestSchema>
export type TDocumentListRequest = z.infer<typeof documentListRequestSchema>
export type TDocumentStatusValue = z.infer<typeof documentStatusValueSchema>
export type TDocument = z.infer<typeof documentSchema>
export type TDocumentListResponse = z.infer<typeof documentListResponseSchema>
export type TPresignedPost = z.infer<typeof presignedPostSchema>
export type TUploadResponse = z.infer<typeof uploadResponseSchema>
export type TDocumentDeleteResponse = z.infer<typeof documentDeleteResponseSchema>
export type TApiErrorCode = z.infer<typeof apiErrorCodeSchema>
export type TApiError = z.infer<typeof apiErrorSchema>
export type TSourceRef = z.infer<typeof sourceRefSchema>
export type TConfidence = z.infer<typeof confidenceSchema>
export type TQuoteStatus = z.infer<typeof quoteStatusSchema>
export type TIntegrityFlag = z.infer<typeof integrityFlagSchema>
export type TCitation = z.infer<typeof citationSchema>
export type TClaim = z.infer<typeof claimSchema>
export type TRagEvidenceEvent = z.infer<typeof ragEvidenceEventSchema>
export type TRagResultEvent = z.infer<typeof ragResultEventSchema>
export type TUsage = z.infer<typeof usageSchema>
export type TContextQuery = z.infer<typeof contextQuerySchema>
export type TContextResponse = z.infer<typeof contextResponseSchema>
