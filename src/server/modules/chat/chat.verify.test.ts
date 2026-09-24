import { describe, expect, it } from "vitest"

import { ABSTENTION_TEXT } from "@/contracts"
import type { TEvidence } from "@/server/modules/retrieval/retrieval.types"

import { splitClaims, verifyAnswer } from "./chat.verify"

const evidence = (marker: string, text: string): TEvidence => ({
  marker,
  chunkId: `file-1:${marker}`,
  fileId: "0b6d2a1e-6c31-4f6a-9c2c-9f1e2a3b4c5d",
  fileName: "handbook.md",
  seq: 0,
  headingPath: ["Limits"],
  startLine: 10,
  endLine: 12,
  text,
  score: 0.8,
})

const CORPUS = [
  evidence("c1", "The maximum request body of the ingest endpoint is 5 MB."),
  evidence("c2", "The maximum request body of the ingest endpoint is 8 MB."),
]

const quoteStatuses = (text: string, sources: readonly TEvidence[]) => {
  const verdict = verifyAnswer(text, sources)
  return {
    failures: verdict.quoteFailures,
    statuses: verdict.citations.map((citation) => [citation.marker, citation.quoteStatus]),
  }
}

describe("splitClaims", () => {
  const RESOLVED = new Set(["c1", "c2"])

  const sliced = (text: string) =>
    splitClaims(text, RESOLVED).map((claim) => ({
      text: text.slice(claim.start, claim.end),
      markers: claim.markers,
      cited: claim.cited,
    }))

  it("keeps a trailing marker with the sentence it follows", () => {
    expect(sliced("The limit is 25 requests. [c1]")).toEqual([
      { text: "The limit is 25 requests. [c1]", markers: ["c1"], cited: true },
    ])
  })

  it("hands a marker that opens the next line back to the sentence before it", () => {
    expect(sliced("The cap is 10 days.\n[c1] It applies to every team.")).toEqual([
      { text: "The cap is 10 days.\n[c1]", markers: ["c1"], cited: true },
      { text: "It applies to every team.", markers: [], cited: false },
    ])
  })

  it("collects several markers on one claim", () => {
    expect(sliced("The cap is 10 days [c1][c2].")).toEqual([
      { text: "The cap is 10 days [c1][c2].", markers: ["c1", "c2"], cited: true },
    ])
  })

  it("makes each list item its own claim, without its number", () => {
    expect(sliced("1. The cap is 10 days [c1]\n2. The floor is 2 days [c2]")).toEqual([
      { text: "The cap is 10 days [c1]", markers: ["c1"], cited: true },
      { text: "The floor is 2 days [c2]", markers: ["c2"], cited: true },
    ])
  })

  it("does not break on an abbreviation", () => {
    expect(sliced("Payment is due in 30 days [c1], e.g. net 30.")).toHaveLength(1)
  })

  it("treats a colon as an introduction, not the end of a claim", () => {
    expect(sliced("The documents disagree: the cap is 10 days [c1].")).toEqual([
      { text: "The documents disagree: the cap is 10 days [c1].", markers: ["c1"], cited: true },
    ])
  })

  it("drops a connective that carries no marker", () => {
    expect(sliced("Yes. The cap is 10 days [c1].")).toEqual([
      { text: "The cap is 10 days [c1].", markers: ["c1"], cited: true },
    ])
  })

  it("keeps a short fragment that does carry a marker", () => {
    expect(sliced("Yes [c1]. The cap is 10 days [c2].")).toEqual([
      { text: "Yes [c1].", markers: ["c1"], cited: true },
      { text: "The cap is 10 days [c2].", markers: ["c2"], cited: true },
    ])
  })

  it("leaves the refusal sentence out, so it is never counted as uncited", () => {
    expect(sliced(`Partly: 37 days [c1]. ${ABSTENTION_TEXT}.`)).toEqual([
      { text: "Partly: 37 days [c1].", markers: ["c1"], cited: true },
    ])
    expect(splitClaims(ABSTENTION_TEXT, RESOLVED)).toEqual([])
  })

  it("marks a claim whose marker was never resolved as uncited", () => {
    expect(sliced("The cap is 10 days [c9].")).toEqual([
      { text: "The cap is 10 days [c9].", markers: ["c9"], cited: false },
    ])
  })

  it("has nothing to say about an empty answer", () => {
    expect(splitClaims("   \n  ", RESOLVED)).toEqual([])
  })
})

describe("verifyAnswer", () => {
  it("calls a fully cited answer with no quotations supported", () => {
    const verdict = verifyAnswer("The ingest endpoint accepts up to 5 MB [c1].", CORPUS)

    expect(verdict.confidence).toBe("supported")
    expect(verdict.abstained).toBe(false)
    expect(verdict.citations).toEqual([
      expect.objectContaining({ marker: "c1", quoteStatus: "none" }),
    ])
    expect(verdict.claims).toEqual([
      {
        start: 0,
        end: "The ingest endpoint accepts up to 5 MB [c1].".length,
        markers: ["c1"],
        cited: true,
      },
    ])
    expect(verdict.integrity).toEqual([])
  })

  it("resolves markers in order of first appearance, once each", () => {
    const verdict = verifyAnswer("Yes [c2]. Also [c1], and again [c2] and [c9].", CORPUS)

    expect(verdict.citations.map((citation) => citation.marker)).toEqual(["c2", "c1"])
    expect(verdict.unknownMarkers).toEqual(["c9"])
  })

  it("ignores things that look almost like markers", () => {
    const verdict = verifyAnswer("The cap [c] [cx] [1] (c1) is 5 MB.", CORPUS)

    expect(verdict.citations).toEqual([])
    expect(verdict.unknownMarkers).toEqual([])
  })

  it("keeps both sides of a conflict and stays supported", () => {
    const verdict = verifyAnswer(
      "The documents disagree: the API reference says 5 MB [c1], and the contract says 8 MB [c2].",
      CORPUS,
    )

    expect(verdict.confidence).toBe("supported")
    expect(verdict.citations.map((citation) => citation.marker)).toEqual(["c1", "c2"])
    expect(verdict.claims.every((claim) => claim.cited)).toBe(true)
  })

  it("drops to partially supported when a sentence carries no citation", () => {
    const verdict = verifyAnswer(
      "The ingest endpoint accepts up to 5 MB [c1]. The limit was raised last year.",
      CORPUS,
    )

    expect(verdict.confidence).toBe("partially_supported")
    expect(verdict.claims.filter((claim) => !claim.cited)).toHaveLength(1)
  })

  it("reports an invented marker and never calls the answer supported", () => {
    const verdict = verifyAnswer("The cap is 5 MB [c1] and the floor is 1 MB [c9].", CORPUS)

    expect(verdict.unknownMarkers).toEqual(["c9"])
    expect(verdict.integrity).toEqual(["unknown_markers"])
    expect(verdict.confidence).toBe("partially_supported")
  })

  it("reads a refusal with no citations as an abstention, whatever its shape", () => {
    for (const text of [
      ABSTENTION_TEXT,
      "  I COULD not find sufficient   support in the documents.",
    ]) {
      const verdict = verifyAnswer(text, CORPUS)

      expect(verdict.abstained).toBe(true)
      expect(verdict.confidence).toBe("unsupported")
      expect(verdict.claims).toEqual([])
      expect(verdict.citations).toEqual([])
    }
  })

  it("reads a refusal next to real citations as a partial answer", () => {
    const verdict = verifyAnswer(`The cap is 5 MB [c1]. ${ABSTENTION_TEXT} for the floor.`, CORPUS)

    expect(verdict.abstained).toBe(false)
    expect(verdict.flaggedMissingEvidence).toBe(true)
    expect(verdict.confidence).toBe("partially_supported")
  })

  it("flags an answer saying part of the question is not covered", () => {
    const verdict = verifyAnswer(
      "The cap is 5 MB [c1]. The fee is not covered in the documents.",
      CORPUS,
    )

    expect(verdict.flaggedMissingEvidence).toBe(true)
    expect(verdict.confidence).toBe("partially_supported")
  })

  it("reports an evidence block copied into the answer", () => {
    const verdict = verifyAnswer(
      "Evidence [c1] (handbook.md · lines 10–12):\nThe cap is 5 MB [c1].",
      CORPUS,
    )

    expect(verdict.integrity).toContain("leaked_evidence_markup")
    expect(verdict.confidence).toBe("partially_supported")
  })

  it("has nothing to support when the model produced nothing", () => {
    const verdict = verifyAnswer("", CORPUS)

    expect(verdict.integrity).toEqual(["empty_answer"])
    expect(verdict.confidence).toBe("unsupported")
  })
})

describe("verifyAnswer quotations", () => {
  it("reads every quotation style", () => {
    const source = evidence("c1", "thirty days, two weeks and one year")

    expect(
      quoteStatuses('He said "thirty days" and «two weeks» and “one year” [c1].', [source]),
    ).toEqual({ failures: 0, statuses: [["c1", "verified"]] })
    expect(
      quoteStatuses('He said "thirty days" and «two weeks» and “one week” [c1].', [source]),
    ).toEqual({ failures: 1, statuses: [["c1", "unverified"]] })
  })

  it("takes a single-quoted span only from four words up", () => {
    const source = evidence("c1", "nothing of the kind")

    expect(quoteStatuses("It is 'thirty days' long [c1].", [source]).failures).toBe(0)
    expect(quoteStatuses("It says 'the cap is thirty days' here [c1].", [source]).failures).toBe(1)
  })

  it("does not read a pair of apostrophes as a quotation", () => {
    const source = evidence("c1", "nothing of the kind")

    expect(
      quoteStatuses("The supplier's registered number isn't in the documents [c1].", [source])
        .failures,
    ).toBe(0)
  })

  it("checks a quotation against the sources its own claim cited and no others", () => {
    // The phrase does sit in c1, but the second claim never cited c1.
    expect(
      quoteStatuses('The cap is "thirty days" [c1]. The floor is "thirty days" [c2].', [
        evidence("c1", "the cap is thirty days"),
        evidence("c2", "the floor is two days"),
      ]),
    ).toEqual({
      failures: 1,
      statuses: [
        ["c1", "verified"],
        ["c2", "unverified"],
      ],
    })
  })

  it("verifies through reflowed whitespace and typographic quotes", () => {
    expect(
      quoteStatuses("It says “thirty  days” [c1].", [
        evidence("c1", "the cap is\nthirty days in total"),
      ]),
    ).toEqual({ failures: 0, statuses: [["c1", "verified"]] })
  })

  it("cannot verify a quotation in a claim that cited nothing", () => {
    expect(
      quoteStatuses('The cap is "thirty days". Also 10 days [c1].', [
        evidence("c1", "thirty days"),
      ]),
    ).toEqual({ failures: 1, statuses: [["c1", "none"]] })
  })

  it("lets one failed quotation outweigh a verified one on the same source", () => {
    expect(
      quoteStatuses('It says "thirty days" [c1]. It also says "ninety days" [c1].', [
        evidence("c1", "thirty days"),
      ]),
    ).toEqual({ failures: 1, statuses: [["c1", "unverified"]] })
  })
})
