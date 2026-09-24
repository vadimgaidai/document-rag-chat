import { Send, Square } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MAX_QUESTION_CHARS } from "@/contracts"
import { QUESTION_COUNTER_THRESHOLD } from "@/features/chat/constants"
import { m } from "@/paraglide/messages"

type TChatInputProps = {
  isLoading: boolean
  onSend: (text: string) => void
  onStop: () => void
}

export const ChatInput = ({ isLoading, onSend, onStop }: TChatInputProps) => {
  const [value, setValue] = useState("")
  const question = value.trim()
  const nearLimit = value.length >= MAX_QUESTION_CHARS - QUESTION_COUNTER_THRESHOLD

  const send = () => {
    if (!question || isLoading) return
    onSend(question)
    setValue("")
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-1 flex-col gap-1">
        <Textarea
          className="max-h-40"
          maxLength={MAX_QUESTION_CHARS}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return
            event.preventDefault()
            send()
          }}
          placeholder={m.chat_input_placeholder()}
          rows={2}
          value={value}
        />
        {nearLimit && (
          <span aria-live="polite" className="self-end text-xs text-muted-foreground tabular-nums">
            {value.length} / {MAX_QUESTION_CHARS}
          </span>
        )}
      </div>
      {isLoading ? (
        <Button onClick={onStop} size="icon" type="button" variant="outline">
          <Square aria-hidden="true" />
          <span className="sr-only">{m.chat_stop()}</span>
        </Button>
      ) : (
        <Button disabled={!question} onClick={send} size="icon" type="button">
          <Send aria-hidden="true" />
          <span className="sr-only">{m.chat_send()}</span>
        </Button>
      )}
    </div>
  )
}
