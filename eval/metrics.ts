import type { TSourceRef, TUsage } from "@/contracts"

import { PRICES, RETRIEVAL_USD_PER_QUESTION } from "./pricing"
import { RUN_OUTCOME } from "./sse"

import type { TQuestion } from "./questions"
import type { TRunResult } from "./sse"

export type TLineRange = readonly [number, number]

export type TResolvedPassage = { fileId: string; lines: TLineRange }

export const ABSTENTION = {
  correct: "correct",
  missedAbstain: "missed_abstain",
  unnecessaryAbstain: "unnecessary_abstain",
  notApplicable: "n/a",
} as const

export const STAGE = {
  transport: "transport",
  retrievalFailure: "retrieval_failure",
  citationFailure: "citation_failure",
  abstentionFailure: "abstention_failure",
  pendingReview: "pending_review",
} as const

export type TAbstention = (typeof ABSTENTION)[keyof typeof ABSTENTION]
export type TStage = (typeof STAGE)[keyof typeof STAGE]

export type TQuestionMetrics = {
  hitAt5: boolean | null
  coverage: { found: number; total: number }
  citationAccuracy: { correct: number; total: number }
  abstention: TAbstention
  stage: TStage
  costUsd: number | "unknown"
}

export const overlaps = (a: TLineRange, b: TLineRange) => a[0] <= b[1] && b[0] <= a[1]

const matches = (passage: TResolvedPassage, ref: TSourceRef) =>
  passage.fileId === ref.fileId && overlaps(passage.lines, [ref.startLine, ref.endLine])

const covered = (passage: TResolvedPassage, refs: readonly TSourceRef[]) =>
  refs.some((ref) => matches(passage, ref))

export const hitAt5 = (expected: readonly TResolvedPassage[], evidence: readonly TSourceRef[]) =>
  expected.length === 0 ? null : expected.some((passage) => covered(passage, evidence))

export const coverage = (
  expected: readonly TResolvedPassage[],
  evidence: readonly TSourceRef[],
) => ({
  found: expected.filter((passage) => covered(passage, evidence)).length,
  total: expected.length,
})

export const citationAccuracy = (
  expected: readonly TResolvedPassage[],
  citations: readonly TSourceRef[],
) => ({
  correct: citations.filter((citation) => expected.some((passage) => matches(passage, citation)))
    .length,
  total: citations.length,
})

export const abstention = (expectAbstain: boolean, result: TRunResult["result"]): TAbstention => {
  if (!result) return ABSTENTION.notApplicable
  if (expectAbstain) return result.abstained ? ABSTENTION.correct : ABSTENTION.missedAbstain
  return result.abstained ? ABSTENTION.unnecessaryAbstain : ABSTENTION.notApplicable
}

export const cost = (usage: TUsage | "unknown", generated: boolean): number | "unknown" => {
  if (!generated) return RETRIEVAL_USD_PER_QUESTION
  if (usage === "unknown" || usage.inputTokens === undefined || usage.outputTokens === undefined) {
    return "unknown"
  }

  const generation =
    usage.inputTokens * PRICES.novaLite.inputPer1M +
    usage.outputTokens * PRICES.novaLite.outputPer1M
  return RETRIEVAL_USD_PER_QUESTION + generation / 1_000_000
}

export const stage = (
  question: TQuestion,
  run: TRunResult,
  expected: readonly TResolvedPassage[],
): TStage => {
  if (run.outcome !== RUN_OUTCOME.ok) return STAGE.transport

  const found = coverage(expected, run.evidence ?? [])
  const cited = citationAccuracy(expected, run.result?.citations ?? [])
  const judged = !question.expectAbstain && found.total > 0

  if (judged && found.found < found.total) return STAGE.retrievalFailure
  if (judged && cited.total > 0 && cited.correct === 0) return STAGE.citationFailure

  const outcome = abstention(question.expectAbstain, run.result)
  if (outcome === ABSTENTION.missedAbstain || outcome === ABSTENTION.unnecessaryAbstain) {
    return STAGE.abstentionFailure
  }

  return STAGE.pendingReview
}

export const evaluate = (
  question: TQuestion,
  run: TRunResult,
  expected: readonly TResolvedPassage[],
): TQuestionMetrics => ({
  hitAt5: hitAt5(expected, run.evidence ?? []),
  coverage: coverage(expected, run.evidence ?? []),
  citationAccuracy: citationAccuracy(expected, run.result?.citations ?? []),
  abstention: abstention(question.expectAbstain, run.result),
  stage: stage(question, run, expected),
  costUsd: cost(run.usage, run.result?.generated ?? true),
})
