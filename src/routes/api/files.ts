import { createFileRoute } from "@tanstack/react-router"

import {
  API_ERROR_CODE,
  documentListRequestSchema,
  MAX_FILE_BYTES,
  uploadRequestInputSchema,
  uploadRequestSchema,
} from "@/contracts"
import type { TApiError, TApiErrorCode } from "@/contracts"
import { createDocumentsService } from "@/server/app"

const documentsService = createDocumentsService()

const NO_STORE = { "Cache-Control": "no-store" } as const

const STATUS_BY_CODE: Record<TApiErrorCode, number> = {
  [API_ERROR_CODE.invalidType]: 400,
  [API_ERROR_CODE.tooLarge]: 413,
  [API_ERROR_CODE.limitReached]: 409,
  [API_ERROR_CODE.invalidRequest]: 400,
  [API_ERROR_CODE.notFound]: 404,
  [API_ERROR_CODE.internal]: 500,
}

const errorResponse = (code: TApiErrorCode, message: string) => {
  const body: TApiError = { code, message }
  return Response.json(body, { status: STATUS_BY_CODE[code], headers: NO_STORE })
}

const listHandler = async ({ request }: { request: Request }) => {
  try {
    const { searchParams } = new URL(request.url)
    const query = documentListRequestSchema.safeParse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    })

    if (!query.success) {
      return errorResponse(API_ERROR_CODE.invalidRequest, "`cursor` or `limit` is not valid.")
    }

    return Response.json(await documentsService.list(query.data), { headers: NO_STORE })
  } catch (error) {
    console.error("[api/files] listing failed", error)
    return errorResponse(API_ERROR_CODE.internal, "The document list could not be read.")
  }
}

const createUploadHandler = async ({ request }: { request: Request }) => {
  try {
    // The bytes never reach this route, so the name and the declared size are
    // everything there is to reject on — each with its own code.
    const input = uploadRequestInputSchema.safeParse(await request.json())
    if (!input.success) {
      return errorResponse(API_ERROR_CODE.invalidRequest, "`name` and `sizeBytes` are required.")
    }

    if (input.data.sizeBytes > MAX_FILE_BYTES) {
      return errorResponse(API_ERROR_CODE.tooLarge, "The file is larger than the upload limit.")
    }

    const parsed = uploadRequestSchema.safeParse(input.data)
    if (!parsed.success) {
      return errorResponse(API_ERROR_CODE.invalidType, "Only Markdown files are accepted.")
    }

    const result = await documentsService.createUpload(parsed.data)
    if (!result.ok) {
      return errorResponse(result.code, result.message)
    }

    return Response.json(result.response, { status: 201, headers: NO_STORE })
  } catch (error) {
    console.error("[api/files] creating the upload failed", error)
    return errorResponse(API_ERROR_CODE.internal, "The upload could not be prepared.")
  }
}

export const Route = createFileRoute("/api/files")({
  server: {
    handlers: {
      GET: listHandler,
      POST: createUploadHandler,
    },
  },
})
