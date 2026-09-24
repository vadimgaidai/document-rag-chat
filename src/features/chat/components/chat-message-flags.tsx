import type { TRagResultEvent } from "@/contracts"
import { formatIntegrityFlags } from "@/features/chat/utils/format"
import { m } from "@/paraglide/messages"

type TChatMessageFlagsProps = {
  result: TRagResultEvent
}

export const ChatMessageFlags = ({ result }: TChatMessageFlagsProps) => {
  const hasUncited = result.claims.some((claim) => !claim.cited)

  if (result.integrity.length === 0 && !hasUncited) {
    return null
  }

  return (
    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
      {result.integrity.length > 0 && (
        <span className="text-destructive">
          {m.chat_answer_flags({ flags: formatIntegrityFlags(result.integrity) })}
        </span>
      )}
      {hasUncited && <span>{m.chat_legend_unsupported()}</span>}
    </div>
  )
}
