import type { TRagResultEvent, TSourceRef } from "@/contracts"
import type { CHAT_COMPLETION } from "@/features/chat/constants"

import type { UIMessage } from "@tanstack/ai-react"

export type TChatCompletion = (typeof CHAT_COMPLETION)[keyof typeof CHAT_COMPLETION]

export type TRagRun = {
  messageId?: string
  evidence?: TSourceRef[]
  result?: TRagResultEvent
  completion: TChatCompletion
}

export type TRagChat = {
  messages: UIMessage[]
  sendMessage: (text: string) => void
  reload: () => void
  stop: () => void
  isLoading: boolean
  error: Error | undefined
  runFor: (messageId: string) => TRagRun | undefined
}

export type TOpenCitation = (citation: TSourceRef) => void
