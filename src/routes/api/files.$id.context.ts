import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { API_ERROR_CODE, contextQuerySchema } from "@/contracts"
import { createDocumentsService } from "@/server/app"
import { errorResponse, NO_STORE } from "@/server/shared/utils/api-response"

const documentsService = createDocumentsService()

const fileIdSchema = z.uuid()

const contextHandler = async ({
  request,
  params,
}: {
  request: Request
  params: { id: string }
}) => {
  try {
    const fileId = fileIdSchema.safeParse(params.id)
    if (!fileId.success) {
      return errorResponse(API_ERROR_CODE.invalidRequest, "The file id is not valid.")
    }

    const { searchParams } = new URL(request.url)
    const query = contextQuerySchema.safeParse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      pad: searchParams.get("pad") ?? undefined,
    })
    if (!query.success) {
      return errorResponse(API_ERROR_CODE.invalidRequest, "`from`, `to` or `pad` is not valid.")
    }

    const context = await documentsService.readContext(fileId.data, query.data)
    if (!context) {
      return errorResponse(API_ERROR_CODE.notFound, "The document does not exist.")
    }

    return Response.json(context, { headers: NO_STORE })
  } catch (error) {
    console.error("[api/files/context] reading the passage failed", error)
    return errorResponse(API_ERROR_CODE.internal, "The passage could not be read.")
  }
}

export const Route = createFileRoute("/api/files/$id/context")({
  server: {
    handlers: {
      GET: contextHandler,
    },
  },
})
