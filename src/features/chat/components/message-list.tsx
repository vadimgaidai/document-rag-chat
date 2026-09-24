import { AssistantMessage } from "@/features/chat/components/assistant-message"
import { UserMessage } from "@/features/chat/components/user-message"
import { MESSAGE_AUTHOR } from "@/features/chat/constants"
import type { TOpenCitation, TRagRun } from "@/features/chat/types"
import { m } from "@/paraglide/messages"

import type { UIMessage } from "@tanstack/ai-react"

type TMessageListProps = {
  messages: UIMessage[]
  isLoading: boolean
  runFor: (messageId: string) => TRagRun | undefined
  onOpenCitation: TOpenCitation
}

const textOf = (message: UIMessage) =>
  message.parts.reduce((text, part) => (part.type === "text" ? text + part.content : text), "")

export const MessageList = ({ messages, isLoading, runFor, onOpenCitation }: TMessageListProps) => {
  const last = messages[messages.length - 1]
  const awaitingFirstToken =
    isLoading && (!last || last.role !== MESSAGE_AUTHOR.assistant || !textOf(last))

  return (
    <div aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto">
      {messages.map((message) =>
        message.role === MESSAGE_AUTHOR.user ? (
          <UserMessage key={message.id} text={textOf(message)} />
        ) : (
          <AssistantMessage
            key={message.id}
            onOpenCitation={onOpenCitation}
            run={runFor(message.id)}
            text={textOf(message)}
          />
        ),
      )}

      {awaitingFirstToken && (
        <span className="text-sm text-muted-foreground">{m.chat_thinking()}</span>
      )}
    </div>
  )
}
