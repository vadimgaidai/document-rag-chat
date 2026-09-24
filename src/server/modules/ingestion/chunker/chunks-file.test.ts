import { describe, expect, it } from "vitest"

import { parseChunks, serializeChunks } from "./chunks-file"

import type { TChunk } from "./chunker.types"

const chunk = (seq: number, overrides: Partial<TChunk> = {}): TChunk => ({
  chunkId: `file-1:${String(seq)}`,
  fileId: "file-1",
  seq,
  headingPath: ["Handbook", "Leave"],
  startLine: seq * 10 + 1,
  endLine: seq * 10 + 9,
  text: `chunk ${String(seq)}`,
  ...overrides,
})

describe("serializeChunks", () => {
  it("writes one line per chunk and ends with a newline", () => {
    const text = serializeChunks([chunk(0), chunk(1)])

    expect(text.split("\n")).toHaveLength(3)
    expect(text.endsWith("\n")).toBe(true)
  })

  it("writes nothing for no chunks", () => {
    expect(serializeChunks([])).toBe("")
  })

  it("keeps newlines inside the chunk text on one line", () => {
    const text = serializeChunks([chunk(0, { text: "first\nsecond" })])

    expect(text.split("\n")).toHaveLength(2)
  })
})

describe("parseChunks", () => {
  it("round-trips what serializeChunks wrote", () => {
    const chunks = [chunk(0), chunk(1, { headingPath: [] }), chunk(2, { text: "with\nnewlines" })]

    expect(parseChunks(serializeChunks(chunks))).toEqual(chunks)
  })

  it("ignores blank lines", () => {
    expect(parseChunks(`\n${serializeChunks([chunk(0)])}\n\n`)).toEqual([chunk(0)])
  })

  it("names the line that is not JSON", () => {
    const text = `${serializeChunks([chunk(0)])}not json\n`

    expect(() => parseChunks(text)).toThrow("line 2")
  })

  it("names the line that is JSON but not a chunk", () => {
    const text = serializeChunks([chunk(0)]) + JSON.stringify({ chunkId: "file-1:1" })

    expect(() => parseChunks(text)).toThrow("line 2")
  })
})
