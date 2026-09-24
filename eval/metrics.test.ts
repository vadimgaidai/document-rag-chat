import { describe, expect, it } from "vitest"

import type { TSourceRef, TCitation, TRagResultEvent } from "@/contracts"

import {
  ABSTENTION,
  abstention,
  citationAccuracy,
  cost,
  coverage,
  evaluate,
  hitAt5,
  overlaps,
  STAGE,
  stage,
} from "./metrics"
import { RETRIEVAL_USD_PER_QUESTION } from "./pricing"
import { RUN_OUTCOME } from "./sse"

import type { TResolvedPassage } from "./metrics"
import type { TQuestion } from "./questions"
import type { TRunResult } from "./sse"

const FILE_A = "file-a"
const FILE_B = "file-b"

const ref = (fileId: string, startLine: number, endLine: number, marker = "c1"): TSourceRef => ({
  marker,
  chunkId: `${fileId}-${String(startLine)}`,
  fileId,
  fileName: `${fileId}.md`,
  headingPath: ["Section"],
  startLine,
  endLine,
})

const cite = (...args: Parameters<typeof ref>): TCitation => ({
  ...ref(...args),
  quoteStatus: "none",
})

const result = (overrides: Partial<TRagResultEvent> = {}): TRagResultEvent => ({
  runId: "r1",
  generated: true,
  abstained: false,
  confidence: "supported",
  citations: [],
  claims: [],
  unknownMarkers: [],
  quoteFailures: 0,
  flaggedMissingEvidence: false,
  integrity: [],
  ...overrides,
})

const passage = (fileId: string, from: number, to: number): TResolvedPassage => ({
  fileId,
  lines: [from, to],
})

const question = (overrides: Partial<TQuestion> = {}): TQuestion => ({
  id: "q01",
  category: "prose",
  question: "How long?",
  expectedAnswer: "17 minutes",
  expectedPassages: [],
  expectAbstain: false,
  ...overrides,
})

const run = (overrides: Partial<TRunResult> = {}): TRunResult => ({
  outcome: RUN_OUTCOME.ok,
  text: "17 minutes [c1]",
  evidence: [],
  result: result(),
  resultRaw: undefined,
  usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 },
  firstByteMs: 120,
  totalMs: 2_400,
  ...overrides,
})

describe("overlaps", () => {
  it("is true when the ranges share a line, including at the edge", () => {
    expect(overlaps([10, 20], [20, 30])).toBe(true)
    expect(overlaps([10, 20], [5, 10])).toBe(true)
    expect(overlaps([10, 20], [12, 14])).toBe(true)
  })

  it("is false when the ranges are disjoint", () => {
    expect(overlaps([10, 20], [21, 30])).toBe(false)
  })
})

describe("hitAt5", () => {
  it("is null when the question expects no passage", () => {
    expect(hitAt5([], [ref(FILE_A, 1, 9)])).toBeNull()
  })

  it("is true when at least one expected passage is in the evidence", () => {
    const expected = [passage(FILE_A, 40, 40), passage(FILE_B, 960, 962)]
    expect(hitAt5(expected, [ref(FILE_A, 35, 45)])).toBe(true)
  })

  it("is false when the evidence is from the right lines of the wrong document", () => {
    expect(hitAt5([passage(FILE_A, 40, 40)], [ref(FILE_B, 35, 45)])).toBe(false)
  })
})

describe("coverage", () => {
  it("counts the expected passages the evidence reaches", () => {
    const expected = [passage(FILE_A, 40, 40), passage(FILE_A, 960, 962), passage(FILE_B, 43, 45)]
    expect(coverage(expected, [ref(FILE_A, 30, 50), ref(FILE_B, 44, 60)])).toEqual({
      found: 2,
      total: 3,
    })
  })
})

describe("citationAccuracy", () => {
  it("counts a citation as correct only when its file and range overlap", () => {
    const expected = [passage(FILE_A, 40, 40)]
    const citations = [
      ref(FILE_A, 38, 42, "c1"),
      ref(FILE_A, 900, 910, "c2"),
      ref(FILE_B, 40, 40, "c3"),
    ]
    expect(citationAccuracy(expected, citations)).toEqual({ correct: 1, total: 3 })
  })

  it("has nothing to judge when the answer cited nothing", () => {
    expect(citationAccuracy([passage(FILE_A, 40, 40)], [])).toEqual({ correct: 0, total: 0 })
  })
})

describe("abstention", () => {
  it("names each of the four outcomes", () => {
    const abstained = result({ abstained: true })
    const answered = result({ abstained: false })

    expect(abstention(true, abstained)).toBe(ABSTENTION.correct)
    expect(abstention(true, answered)).toBe(ABSTENTION.missedAbstain)
    expect(abstention(false, abstained)).toBe(ABSTENTION.unnecessaryAbstain)
    expect(abstention(false, answered)).toBe(ABSTENTION.notApplicable)
  })

  it("cannot be judged without a result event", () => {
    expect(abstention(true, null)).toBe(ABSTENTION.notApplicable)
  })
})

describe("cost", () => {
  it("prices generation from the token counts and adds the retrieval estimate", () => {
    expect(cost({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, true)).toBeCloseTo(
      0.06 + 0.24 + RETRIEVAL_USD_PER_QUESTION,
      10,
    )
  })

  it("charges no generation when the model was never called", () => {
    expect(cost("unknown", false)).toBeCloseTo(RETRIEVAL_USD_PER_QUESTION, 10)
  })

  it("is unknown when a generated run reported no usage", () => {
    expect(cost("unknown", true)).toBe("unknown")
  })

  it("is unknown when usage arrived without one of the token counts", () => {
    expect(cost({ inputTokens: 500 }, true)).toBe("unknown")
  })
})

describe("stage", () => {
  const expected = [passage(FILE_A, 40, 40)]
  const hit = ref(FILE_A, 35, 45)

  it("reports transport before anything else", () => {
    const failed = run({ outcome: RUN_OUTCOME.timeout, evidence: [hit], result: null })
    expect(stage(question(), failed, expected)).toBe(STAGE.transport)
  })

  it("reports a retrieval failure before a citation failure", () => {
    const missed = run({
      evidence: [ref(FILE_B, 1, 5)],
      result: result({ citations: [cite(FILE_B, 1, 5)] }),
    })
    expect(stage(question(), missed, expected)).toBe(STAGE.retrievalFailure)
  })

  it("reports a citation failure when the evidence was complete and no citation lands on it", () => {
    const miscited = run({
      evidence: [hit],
      result: result({ citations: [cite(FILE_A, 900, 910)] }),
    })
    expect(stage(question(), miscited, expected)).toBe(STAGE.citationFailure)
  })

  it("reports an abstention failure when an unanswerable question was answered", () => {
    const answered = run({ evidence: [hit] })
    expect(stage(question({ expectAbstain: true }), answered, [])).toBe(STAGE.abstentionFailure)
  })

  it("reports an abstention failure when an answerable question was abstained on", () => {
    const abstained = run({ evidence: [hit], result: result({ abstained: true }) })
    expect(stage(question(), abstained, expected)).toBe(STAGE.abstentionFailure)
  })

  it("leaves a mechanically clean run to the reviewer", () => {
    const clean = run({
      evidence: [hit],
      result: result({ citations: [cite(FILE_A, 35, 45)] }),
    })
    expect(stage(question(), clean, expected)).toBe(STAGE.pendingReview)
  })
})

describe("evaluate", () => {
  it("prices a run whose usage never arrived as unknown", () => {
    const metrics = evaluate(question(), run({ usage: "unknown" }), [])
    expect(metrics.costUsd).toBe("unknown")
    expect(metrics.hitAt5).toBeNull()
  })

  it("charges the retrieval estimate alone for the no-evidence abstention", () => {
    const abstained = run({
      evidence: null,
      usage: "unknown",
      result: result({ generated: false, abstained: true, confidence: "unsupported" }),
    })
    const metrics = evaluate(question({ expectAbstain: true }), abstained, [])

    expect(metrics.costUsd).toBeCloseTo(RETRIEVAL_USD_PER_QUESTION, 10)
    expect(metrics.abstention).toBe(ABSTENTION.correct)
    expect(metrics.stage).toBe(STAGE.pendingReview)
  })
})
