import { Fragment } from "react"

import type { TCitation, TClaim } from "@/contracts"
import { MarkerText } from "@/features/chat/components/marker-text"
import type { TOpenCitation } from "@/features/chat/types"
import { m } from "@/paraglide/messages"

type TClaimTextProps = {
  text: string
  claims: readonly TClaim[]
  citations: TCitation[]
  onOpen: TOpenCitation
}

type TSegment = {
  start: number
  end: number
  uncited: boolean
}

const segmentsOf = (text: string, claims: readonly TClaim[]): TSegment[] => {
  const segments: TSegment[] = []
  let cursor = 0

  for (const claim of [...claims].sort((a, b) => a.start - b.start)) {
    if (claim.start < cursor || claim.end > text.length) {
      continue
    }

    if (claim.start > cursor) {
      segments.push({ start: cursor, end: claim.start, uncited: false })
    }

    segments.push({ start: claim.start, end: claim.end, uncited: !claim.cited })
    cursor = claim.end
  }

  if (cursor < text.length) {
    segments.push({ start: cursor, end: text.length, uncited: false })
  }

  return segments
}

export const ClaimText = ({ text, claims, citations, onOpen }: TClaimTextProps) => (
  <>
    {segmentsOf(text, claims).map((segment) => {
      const body = (
        <MarkerText
          citations={citations}
          onOpen={onOpen}
          text={text.slice(segment.start, segment.end)}
        />
      )

      if (!segment.uncited) {
        return <Fragment key={segment.start}>{body}</Fragment>
      }

      return (
        <span
          className="text-muted-foreground underline decoration-dashed"
          key={segment.start}
          title={m.chat_unsupported_claim()}
        >
          {body}
        </span>
      )
    })}
  </>
)
