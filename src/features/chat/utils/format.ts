import { INTEGRITY_FLAG } from "@/contracts"
import type { TIntegrityFlag, TSourceRef } from "@/contracts"
import {
  BREADCRUMB_MAX_CHARS,
  BREADCRUMB_SEPARATOR,
  CHAT_COMPLETION,
  CITATION_LABEL_SEPARATOR,
  FLAG_SEPARATOR,
  TOO_LONG_STATUSES,
} from "@/features/chat/constants"
import type { TChatCompletion } from "@/features/chat/types"
import { m } from "@/paraglide/messages"

export const formatBreadcrumb = (headingPath: readonly string[]): string => {
  const joined = headingPath.join(BREADCRUMB_SEPARATOR)
  return joined.length > BREADCRUMB_MAX_CHARS
    ? `${joined.slice(0, BREADCRUMB_MAX_CHARS - 1)}…`
    : joined
}

export const formatCitationLabel = ({
  marker,
  fileName,
  headingPath,
  startLine,
  endLine,
}: TSourceRef): string =>
  [
    `[${marker}] ${fileName}`,
    formatBreadcrumb(headingPath),
    `L${String(startLine)}–${String(endLine)}`,
  ]
    .filter(Boolean)
    .join(CITATION_LABEL_SEPARATOR)

export const formatOpenCitationLabel = ({ fileName, startLine, endLine }: TSourceRef): string =>
  m.chat_citation_open({ file: fileName, from: startLine, to: endLine })

export const markerOf = (part: string): string => part.slice(1, -1)

const FLAG_LABEL: Record<TIntegrityFlag, () => string> = {
  [INTEGRITY_FLAG.unknownMarkers]: m.chat_flag_unknown_markers,
  [INTEGRITY_FLAG.leakedEvidenceMarkup]: m.chat_flag_leaked_markup,
  [INTEGRITY_FLAG.emptyAnswer]: m.chat_flag_empty_answer,
}

export const formatIntegrityFlags = (flags: readonly TIntegrityFlag[]): string =>
  flags.map((flag) => FLAG_LABEL[flag]()).join(FLAG_SEPARATOR)

const INCOMPLETE_LABEL: Partial<Record<TChatCompletion, () => string>> = {
  [CHAT_COMPLETION.stopped]: m.chat_stopped,
  [CHAT_COMPLETION.error]: m.chat_interrupted,
}

export const formatIncompleteLabel = (completion: TChatCompletion | undefined) =>
  completion && INCOMPLETE_LABEL[completion]?.()

export const isTooLongError = (error: Error): boolean => {
  const match = /status: (\d{3})/.exec(error.message)
  return match !== null && TOO_LONG_STATUSES.includes(Number(match[1]))
}
