import { Fragment } from "react"

import type { TSourceRef } from "@/contracts"
import { MARKER_PATTERN, MARKER_SPLIT_PATTERN } from "@/features/chat/constants"
import type { TOpenCitation } from "@/features/chat/types"
import { formatOpenCitationLabel, markerOf } from "@/features/chat/utils/format"

type TMarkerTextProps = {
  text: string
  citations: TSourceRef[]
  onOpen: TOpenCitation
}

export const MarkerText = ({ text, citations, onOpen }: TMarkerTextProps) => {
  const byMarker = new Map(citations.map((citation) => [citation.marker, citation]))

  return (
    <>
      {text.split(MARKER_SPLIT_PATTERN).map((part, index) => {
        if (!MARKER_PATTERN.test(part)) {
          return <Fragment key={index}>{part}</Fragment>
        }

        const citation = byMarker.get(markerOf(part))
        if (!citation) {
          return (
            <span className="text-muted-foreground" key={index}>
              {part}
            </span>
          )
        }

        return (
          <button
            aria-label={formatOpenCitationLabel(citation)}
            className="cursor-pointer font-medium whitespace-nowrap text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid"
            key={index}
            onClick={() => onOpen(citation)}
            type="button"
          >
            {part}
          </button>
        )
      })}
    </>
  )
}
