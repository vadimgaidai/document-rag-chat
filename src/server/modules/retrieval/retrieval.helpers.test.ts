import { describe, expect, it } from "vitest"

import { EVIDENCE_MAX, RERANK_SCORE_FLOOR } from "./retrieval.constants"
import { buildIndex, rrf, search, selectEvidence, statusFingerprint } from "./retrieval.helpers"

import type { TChunkRecord, TScoredChunk } from "./retrieval.types"

const record = (
  chunkId: string,
  text: string,
  headingPath: string[] = ["Invoices"],
): TChunkRecord => ({
  chunkId,
  fileId: "file-1",
  fileName: "invoices.md",
  seq: 0,
  headingPath,
  startLine: 1,
  endLine: 2,
  text,
})

const corpus = [
  record("c-exact", "Invoice INV-2024-0093 was paid on 2024-03-17 for 1,240 EUR."),
  record("c-near", "Invoice INV-2024-0094 is still open."),
  record("c-other", "The invoicing team reconciles payments every month."),
  record("c-config", "Set max_batch_size to 32."),
  record("c-heading", "Nothing relevant here at all.", ["Retention policy"]),
]

describe("search", () => {
  it("ranks the exact identifier first", () => {
    expect(search(buildIndex(corpus), "INV-2024-0093", 10)[0]).toBe("c-exact")
  })

  it("finds an identifier by one of its parts", () => {
    expect(search(buildIndex(corpus), "0094", 10)).toEqual(["c-near"])
  })

  it("finds an underscore-joined identifier", () => {
    expect(search(buildIndex(corpus), "max_batch_size", 10)[0]).toBe("c-config")
  })

  it("finds a date", () => {
    expect(search(buildIndex(corpus), "2024-03-17", 10)).toContain("c-exact")
  })

  it("finds an amount", () => {
    expect(search(buildIndex(corpus), "1,240 EUR", 10)).toContain("c-exact")
  })

  it("does not match on the heading breadcrumb, only on the text", () => {
    expect(search(buildIndex(corpus), "retention policy", 10)).toEqual([])
  })

  it("returns at most k results", () => {
    expect(search(buildIndex(corpus), "invoice", 2)).toHaveLength(2)
  })

  it("returns nothing from an empty index", () => {
    expect(search(buildIndex([]), "invoice", 10)).toEqual([])
  })

  it("returns nothing when no term matches", () => {
    expect(search(buildIndex(corpus), "helicopter", 10)).toEqual([])
  })
})

describe("rrf", () => {
  it("puts an item found by both rankings first", () => {
    const fused = rrf([
      ["a", "b", "c"],
      ["d", "b", "e"],
    ])

    expect(fused[0]?.id).toBe("b")
  })

  it("keeps every id exactly once", () => {
    const fused = rrf([
      ["a", "b"],
      ["b", "a"],
    ])

    expect(fused.map(({ id }) => id).sort()).toEqual(["a", "b"])
  })

  it("scores a rank with 1 / (k + rank)", () => {
    expect(rrf([["a"]], 60)[0]?.score).toBeCloseTo(1 / 61)
  })

  it("leaves ties in the order the rankings produced them", () => {
    expect(rrf([["a", "b"], ["c"]], 60).map(({ id }) => id)).toEqual(["a", "c", "b"])
  })

  it("returns nothing for empty rankings", () => {
    expect(rrf([[], []])).toEqual([])
  })
})

describe("selectEvidence", () => {
  const scored = (chunkId: string, score: number): TScoredChunk => ({
    score,
    record: record(chunkId, `text of ${chunkId}`, ["Leave"]),
  })

  it("numbers the kept chunks c1..cN in the order given", () => {
    const evidence = selectEvidence([scored("a", 0.9), scored("b", 0.4)])

    expect(evidence.map(({ marker, chunkId }) => [marker, chunkId])).toEqual([
      ["c1", "a"],
      ["c2", "b"],
    ])
  })

  it("drops everything below the floor", () => {
    const evidence = selectEvidence([scored("a", 0.9), scored("b", RERANK_SCORE_FLOOR / 2)])

    expect(evidence.map(({ chunkId }) => chunkId)).toEqual(["a"])
  })

  it("keeps a chunk sitting exactly on the floor", () => {
    expect(selectEvidence([scored("a", RERANK_SCORE_FLOOR)])).toHaveLength(1)
  })

  it("caps the result at EVIDENCE_MAX", () => {
    const pile = Array.from({ length: EVIDENCE_MAX + 1 }, (_, index) =>
      scored(`chunk-${String(index)}`, 0.9),
    )

    expect(selectEvidence(pile)).toHaveLength(EVIDENCE_MAX)
  })

  it("carries the chunk's own fields into the evidence", () => {
    expect(selectEvidence([scored("a", 0.9)])[0]).toEqual({
      ...record("a", "text of a", ["Leave"]),
      marker: "c1",
      score: 0.9,
    })
  })

  it("returns nothing for an empty input", () => {
    expect(selectEvidence([])).toEqual([])
  })
})

describe("statusFingerprint", () => {
  const objects = [
    { key: "status/1-a.json", etag: '"aaa"' },
    { key: "status/2-b.json", etag: '"bbb"' },
  ]

  it("does not depend on the listing order", () => {
    expect(statusFingerprint([...objects].reverse())).toBe(statusFingerprint(objects))
  })

  it("changes when an ETag changes", () => {
    const changed = [objects[0], { ...objects[1], etag: '"ccc"' }]

    expect(statusFingerprint(changed)).not.toBe(statusFingerprint(objects))
  })

  it("changes when a key is added", () => {
    const added = [...objects, { key: "status/3-c.json", etag: '"ddd"' }]

    expect(statusFingerprint(added)).not.toBe(statusFingerprint(objects))
  })

  it("changes when a key is removed", () => {
    expect(statusFingerprint([objects[0]])).not.toBe(statusFingerprint(objects))
  })

  it("is empty for an empty listing", () => {
    expect(statusFingerprint([])).toBe("")
  })
})
