import {
  ABSTENTION_TEXT,
  CONFIDENCE,
  INTEGRITY_FLAG,
  QUOTE_STATUS,
  sourceRefSchema,
} from "@/contracts"
import type { TClaim, TConfidence, TIntegrityFlag, TQuoteStatus } from "@/contracts"
import type { TEvidence } from "@/server/modules/retrieval/retrieval.types"

import { MIN_CLAIM_WORDS } from "./chat.constants"

import type { TVerdict } from "./chat.types"

const MARKER = /\[c(\d+)\]/g
const LEADING_MARKERS = /^(?:\[c\d+\]\s*)+/
const LEAKED_EVIDENCE_MARKUP = /^Evidence \[c\d+\] \(/m
const MISSING_EVIDENCE = /could not find|not (?:mentioned|covered) in the (?:documents|evidence)/i
const QUOTED = /"([^"\n]+)"|(?<![\p{L}\p{N}])'([^'\s]+(?:\s+[^'\s]+){3,})'(?![\p{L}\p{N}])/gu

const sentences = new Intl.Segmenter("en", { granularity: "sentence" })

const markersIn = (text: string) => [
  ...new Set([...text.matchAll(MARKER)].map((match) => `c${match[1]}`)),
]

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()

const containsAbstention = (text: string) => normalize(text).includes(normalize(ABSTENTION_TEXT))

export const splitClaims = (text: string, resolved: ReadonlySet<string>): TClaim[] => {
  const spans: { start: number; end: number }[] = []

  for (const { segment, index } of sentences.segment(text)) {
    const offset = segment.search(/\S/)
    if (offset === -1) {
      continue
    }

    let start = index + offset
    const end = index + segment.trimEnd().length
    const previous = spans.at(-1)

    const lead = previous ? LEADING_MARKERS.exec(text.slice(start, end)) : null
    if (previous && lead) {
      previous.end = start + lead[0].trimEnd().length
      start += lead[0].length
    }

    if (start < end) spans.push({ start, end })
  }

  return spans.flatMap(({ start, end }) => {
    const body = text.slice(start, end)
    const markers = markersIn(body)

    if (containsAbstention(body) || (markers.length === 0 && wordCount(body) < MIN_CLAIM_WORDS)) {
      return []
    }

    return [{ start, end, markers, cited: markers.some((marker) => resolved.has(marker)) }]
  })
}

const extractQuotes = (text: string) =>
  [...text.replace(/[“”«»]/g, '"').matchAll(QUOTED)].map((match) => {
    const quote = match[1] ?? match[2] ?? ""
    return { quote, start: match.index + 1, end: match.index + 1 + quote.length }
  })

const confidenceOf = (verdict: Omit<TVerdict, "confidence">): TConfidence => {
  if (verdict.citations.length === 0) return CONFIDENCE.unsupported

  const partial =
    verdict.claims.some((claim) => !claim.cited) ||
    verdict.quoteFailures > 0 ||
    verdict.flaggedMissingEvidence ||
    verdict.integrity.length > 0

  return partial ? CONFIDENCE.partiallySupported : CONFIDENCE.supported
}

export const verifyAnswer = (text: string, evidence: readonly TEvidence[]): TVerdict => {
  const markers = markersIn(text)
  const resolved = markers.flatMap((marker) => evidence.filter((item) => item.marker === marker))
  const unknownMarkers = markers.filter(
    (marker) => !resolved.some((item) => item.marker === marker),
  )
  const claims = splitClaims(text, new Set(resolved.map((item) => item.marker)))

  const quotes = extractQuotes(text).map(({ quote, start, end }) => {
    const claim = claims.find((item) => start >= item.start && end <= item.end)
    const sources = resolved.filter((item) => claim?.markers.includes(item.marker))
    const hits = sources.filter((item) => normalize(item.text).includes(normalize(quote)))
    return { sources, hits }
  })

  const quoteStatus = (item: TEvidence): TQuoteStatus => {
    if (quotes.some(({ sources, hits }) => hits.length === 0 && sources.includes(item))) {
      return QUOTE_STATUS.unverified
    }
    return quotes.some(({ hits }) => hits.includes(item))
      ? QUOTE_STATUS.verified
      : QUOTE_STATUS.none
  }

  const integrity: TIntegrityFlag[] = []
  if (unknownMarkers.length > 0) integrity.push(INTEGRITY_FLAG.unknownMarkers)
  if (LEAKED_EVIDENCE_MARKUP.test(text)) integrity.push(INTEGRITY_FLAG.leakedEvidenceMarkup)
  if (text.trim() === "") integrity.push(INTEGRITY_FLAG.emptyAnswer)

  const refused = containsAbstention(text)
  const verdict = {
    abstained: refused && resolved.length === 0,
    citations: resolved.map((item) => ({
      ...sourceRefSchema.parse(item),
      quoteStatus: quoteStatus(item),
    })),
    claims,
    unknownMarkers,
    quoteFailures: quotes.filter(({ hits }) => hits.length === 0).length,
    flaggedMissingEvidence: (refused && resolved.length > 0) || MISSING_EVIDENCE.test(text),
    integrity,
  }

  return { ...verdict, confidence: confidenceOf(verdict) }
}
