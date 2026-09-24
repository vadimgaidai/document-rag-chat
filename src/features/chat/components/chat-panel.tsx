import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { MAX_QUESTION_CHARS } from "@/contracts"
import type { TSourceRef } from "@/contracts"
import { ChatInput } from "@/features/chat/components/chat-input"
import { ContextViewer } from "@/features/chat/components/context-viewer"
import { MessageList } from "@/features/chat/components/message-list"
import { useRagChat } from "@/features/chat/hooks/use-rag-chat"
import { isTooLongError } from "@/features/chat/utils/format"
import { m } from "@/paraglide/messages"

export const ChatPanel = () => {
  const { messages, sendMessage, reload, stop, isLoading, error, runFor } = useRagChat()
  const [openCitation, setOpenCitation] = useState<TSourceRef | null>(null)

  return (
    <div className="flex min-h-56 flex-1 flex-col gap-3">
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {m.chat_empty()}
        </div>
      ) : (
        <MessageList
          isLoading={isLoading}
          messages={messages}
          onOpenCitation={setOpenCitation}
          runFor={runFor}
        />
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>
            {isTooLongError(error)
              ? m.chat_error_too_long({ max: MAX_QUESTION_CHARS })
              : m.chat_error()}
          </AlertTitle>
          <AlertDescription>
            <Button onClick={reload} size="sm" type="button" variant="outline">
              {m.chat_retry()}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <ChatInput isLoading={isLoading} onSend={sendMessage} onStop={stop} />

      <ContextViewer citation={openCitation} onClose={() => setOpenCitation(null)} />
    </div>
  )
}
