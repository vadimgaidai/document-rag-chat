import { EventType } from "@tanstack/ai/client"
import { useChat } from "@tanstack/ai-react"
import { useRef, useState } from "react"

import {
  RAG_EVIDENCE_EVENT,
  RAG_RESULT_EVENT,
  ragEvidenceEventSchema,
  ragResultEventSchema,
} from "@/contracts"
import { chatApi } from "@/features/chat/api/chat.api"
import { CHAT_COMPLETION } from "@/features/chat/constants"
import type { TChatCompletion, TRagChat, TRagRun } from "@/features/chat/types"

export const useRagChat = (): TRagChat => {
  const [connection] = useState(() => chatApi.connection())
  const [runs, setRuns] = useState(() => new Map<string, TRagRun>())
  const activeRunId = useRef<string | undefined>(undefined)

  const patch = (runId: string, changes: Partial<TRagRun>) =>
    setRuns((current) =>
      new Map(current).set(runId, {
        completion: CHAT_COMPLETION.streaming,
        ...current.get(runId),
        ...changes,
      }),
    )

  const finish = (completion: TChatCompletion) => {
    if (activeRunId.current) {
      patch(activeRunId.current, { completion })
    }
    activeRunId.current = undefined
  }

  const chat = useChat({
    connection,
    onChunk: (chunk) => {
      switch (chunk.type) {
        case EventType.RUN_STARTED:
          activeRunId.current = chunk.runId
          patch(chunk.runId, { completion: CHAT_COMPLETION.streaming })
          break
        case EventType.TEXT_MESSAGE_START:
          if (activeRunId.current) {
            patch(activeRunId.current, { messageId: chunk.messageId })
          }
          break
        case EventType.CUSTOM: {
          if (chunk.name === RAG_EVIDENCE_EVENT) {
            const event = ragEvidenceEventSchema.safeParse(chunk.value).data
            if (event) {
              patch(event.runId, { evidence: event.evidence })
            }
          }
          if (chunk.name === RAG_RESULT_EVENT) {
            const result = ragResultEventSchema.safeParse(chunk.value).data
            if (result) {
              patch(result.runId, { result })
            }
          }
          break
        }
        case EventType.RUN_FINISHED:
          finish(CHAT_COMPLETION.complete)
          break
        case EventType.RUN_ERROR:
          finish(CHAT_COMPLETION.error)
          break
      }
    },
  })

  return {
    messages: chat.messages,
    sendMessage: (text) => void chat.sendMessage(text),
    reload: () => void chat.reload(),
    stop: () => {
      chat.stop()
      finish(CHAT_COMPLETION.stopped)
    },
    isLoading: chat.isLoading,
    error: chat.error,
    runFor: (messageId) => [...runs.values()].find((run) => run.messageId === messageId),
  }
}
