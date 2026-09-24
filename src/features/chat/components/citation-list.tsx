import { TriangleAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { QUOTE_STATUS } from "@/contracts"
import type { TCitation } from "@/contracts"
import type { TOpenCitation } from "@/features/chat/types"
import { formatCitationLabel, formatOpenCitationLabel } from "@/features/chat/utils/format"
import { m } from "@/paraglide/messages"

type TCitationListProps = {
  citations: readonly TCitation[]
  onOpen: TOpenCitation
}

const CitationChip = ({ citation, onOpen }: { citation: TCitation; onOpen: TOpenCitation }) => {
  const unverified = citation.quoteStatus === QUOTE_STATUS.unverified

  return (
    <Badge asChild variant="outline">
      <button
        aria-label={formatOpenCitationLabel(citation)}
        className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
        onClick={() => onOpen(citation)}
        title={unverified ? m.chat_quote_unverified() : undefined}
        type="button"
      >
        {unverified && <TriangleAlert aria-hidden className="text-destructive" />}
        {formatCitationLabel(citation)}
      </button>
    </Badge>
  )
}

export const CitationList = ({ citations, onOpen }: TCitationListProps) => {
  if (citations.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{m.chat_sources_label()}</span>
      <div className="flex flex-wrap gap-1">
        {citations.map((citation) => (
          <CitationChip citation={citation} key={citation.marker} onOpen={onOpen} />
        ))}
      </div>
    </div>
  )
}
