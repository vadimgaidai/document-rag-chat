import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { API_ERROR_CODE } from "@/contracts"
import { createDocumentsService } from "@/server/app"
import { errorResponse, NO_STORE } from "@/server/shared/utils/api-response"

const documentsService = createDocumentsService()

const fileIdSchema = z.uuid()

const deleteHandler = async ({ params }: { params: { id: string } }) => {
  try {
    const fileId = fileIdSchema.safeParse(params.id)
    if (!fileId.success) {
      return errorResponse(API_ERROR_CODE.invalidRequest, "The file id is not valid.")
    }

    const outcome = await documentsService.remove(fileId.data)
    if (outcome === "not-found") {
      return errorResponse(API_ERROR_CODE.notFound, "The document does not exist.")
    }

    return Response.json({ fileId: fileId.data }, { headers: NO_STORE })
  } catch (error) {
    console.error("[api/files/delete] deleting the document failed", error)
    return errorResponse(API_ERROR_CODE.internal, "The document could not be deleted.")
  }
}

export const Route = createFileRoute("/api/files/$id")({
  server: {
    handlers: {
      DELETE: deleteHandler,
    },
  },
})
