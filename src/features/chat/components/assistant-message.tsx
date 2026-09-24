import { ChatMessageFlags } from "@/features/chat/components/chat-message-flags"
import { CitationList } from "@/features/chat/components/citation-list"
import { ClaimText } from "@/features/chat/components/claim-text"
import { MarkerText } from "@/features/chat/components/marker-text"
import { CHAT_COMPLETION } from "@/features/chat/constants"
import type { TOpenCitation, TRagRun } from "@/features/chat/types"
import { formatIncompleteLabel } from "@/features/chat/utils/format"
import { m } from "@/paraglide/messages"

type TAssistantMessageProps = {
  text: string
  run: TRagRun | undefined
  onOpenCitation: TOpenCitation
}

export const AssistantMessage = ({ text, run, onOpenCitation }: TAssistantMessageProps) => {
  const label = formatIncompleteLabel(run?.completion)
  if (!text && !label) return null

  const result = run?.completion === CHAT_COMPLETION.complete ? run.result : undefined
  const citations = result?.citations ?? []

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
        {result ? (
          <ClaimText
            citations={citations}
            claims={result.claims}
            onOpen={onOpenCitation}
            text={text}
          />
        ) : (
          <MarkerText citations={citations} onOpen={onOpenCitation} text={text} />
        )}
      </div>

      {label && <span className="text-xs text-muted-foreground">{label}</span>}

      {run?.completion === CHAT_COMPLETION.streaming && run.evidence && (
        <span className="text-xs text-muted-foreground">
          {m.chat_sources_retrieved({ count: run.evidence.length })}
        </span>
      )}

      {result && <ChatMessageFlags result={result} />}

      <CitationList citations={citations} onOpen={onOpenCitation} />
    </div>
  )
}
