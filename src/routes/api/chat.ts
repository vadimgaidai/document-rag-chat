import { chatParamsFromRequestBody, toServerSentEventsResponse } from "@tanstack/ai"
import { createFileRoute } from "@tanstack/react-router"

import { API_ERROR_CODE, MAX_CHAT_BODY_BYTES } from "@/contracts"
import { createChatService } from "@/server/app"
import { ChatRequestError } from "@/server/modules/chat/chat.helpers"
import { errorResponse } from "@/server/shared/utils/api-response"
import { log } from "@/server/shared/utils/log"

const chatService = createChatService()

const TOO_LARGE_MESSAGE = `The request body is larger than ${String(MAX_CHAT_BODY_BYTES)} bytes.`

type TReadBody = { body: unknown } | { rejected: Response }

const readBody = async (request: Request): Promise<TReadBody> => {
  if (Number(request.headers.get("content-length")) > MAX_CHAT_BODY_BYTES) {
    return { rejected: errorResponse(API_ERROR_CODE.tooLarge, TOO_LARGE_MESSAGE) }
  }

  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_CHAT_BODY_BYTES) {
    return { rejected: errorResponse(API_ERROR_CODE.tooLarge, TOO_LARGE_MESSAGE) }
  }

  try {
    return { body: JSON.parse(text) as unknown }
  } catch {
    return {
      rejected: errorResponse(API_ERROR_CODE.invalidRequest, "The request body is not JSON."),
    }
  }
}

const askHandler = async ({ request }: { request: Request }) => {
  const read = await readBody(request)
  if ("rejected" in read) return read.rejected

  let params: Awaited<ReturnType<typeof chatParamsFromRequestBody>>
  try {
    params = await chatParamsFromRequestBody(read.body)
  } catch (error) {
    if (error instanceof Response) {
      return errorResponse(API_ERROR_CODE.invalidRequest, "The request is not a valid chat body.")
    }
    throw error
  }

  const abortController = new AbortController()
  request.signal.addEventListener("abort", () => {
    log({ stage: "chat.aborted", runId: params.runId })
    abortController.abort()
  })

  try {
    const stream = await chatService.answer({
      messages: params.messages,
      threadId: params.threadId,
      runId: params.runId,
      abortController,
    })

    return toServerSentEventsResponse(stream, {
      abortController,
      headers: {
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    if (error instanceof ChatRequestError) {
      return errorResponse(error.code, error.message)
    }
    console.error("[api/chat] answering failed", error)
    return errorResponse(API_ERROR_CODE.internal, "The answer could not be prepared.")
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: askHandler,
    },
  },
})
