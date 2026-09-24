import type { TRagResultEvent } from "@/contracts"

import type { ModelMessage, UIMessage } from "@tanstack/ai"

export type TChatInput = {
  messages: Array<UIMessage | ModelMessage>
  threadId: string
  runId: string
  abortController: AbortController
}

export type TVerdict = Omit<TRagResultEvent, "runId" | "generated">
