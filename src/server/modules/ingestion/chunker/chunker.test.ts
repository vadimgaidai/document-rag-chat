import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { chunkMarkdown } from "./chunker"
import { HEADING_MAX_CHARS, TARGET_CHARS } from "./chunker.constants"

const readFixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8")

const FIXTURES = [
  "code-with-markdown.md",
  "crlf.md",
  "deep-headings.md",
  "empty.md",
  "giant-code.md",
  "giant-table.md",
  "hidden-html.md",
  "images-and-links.md",
  "images-only.md",
  "long-list.md",
  "nested-fence.md",
  "no-headings.md",
  "unicode.md",
  "whitespace.md",
] as const

const normalize = (source: string) => source.replace(/\r\n/g, "\n")

const linesOf = (source: string, startLine: number, endLine: number) =>
  normalize(source)
    .split("\n")
    .slice(startLine - 1, endLine)
    .join("\n")

describe.each(FIXTURES)("chunkMarkdown on %s", (fixture) => {
  const source = readFixture(fixture)

  it("produces the same chunks every time", async () => {
    expect(await chunkMarkdown(source, "file-1")).toEqual(await chunkMarkdown(source, "file-1"))
  })

  it("numbers chunks densely and identifies them by file and sequence", async () => {
    const chunks = await chunkMarkdown(source, "file-1")
    expect(chunks.map((chunk) => chunk.seq)).toEqual(chunks.map((_chunk, index) => index))
    for (const chunk of chunks) {
      expect(chunk.chunkId).toBe(`file-1:${chunk.seq}`)
      expect(chunk.fileId).toBe("file-1")
    }
  })

  // The citation contract: a reader following [startLine, endLine] into the
  // original must find the text the model was shown.
  it("reports a line range that really contains the chunk", async () => {
    for (const chunk of await chunkMarkdown(source, "file-1")) {
      expect(chunk.startLine).toBeLessThanOrEqual(chunk.endLine)
      expect(linesOf(source, chunk.startLine, chunk.endLine)).toContain(chunk.text)
    }
  })

  it("keeps chunks in document order", async () => {
    const chunks = await chunkMarkdown(source, "file-1")
    const starts = chunks.map((chunk) => chunk.startLine)
    expect(starts).toEqual([...starts].sort((left, right) => left - right))
  })

  it("covers every line that carries text", async () => {
    const chunks = await chunkMarkdown(source, "file-1")
    for (const [index, line] of normalize(source).split("\n").entries()) {
      if (line.trim() === "") continue
      const number = index + 1
      const covered = chunks.some((chunk) => chunk.startLine <= number && number <= chunk.endLine)
      expect({ line: number, covered }).toEqual({ line: number, covered: true })
    }
  })

  it("truncates every breadcrumb entry", async () => {
    for (const chunk of await chunkMarkdown(source, "file-1")) {
      for (const entry of chunk.headingPath) {
        expect(entry.length).toBeLessThanOrEqual(HEADING_MAX_CHARS)
      }
    }
  })
})

describe("heading hierarchy", () => {
  it("nests and pops the breadcrumb by heading depth", async () => {
    const source = ["# Root", "", "## Branch", "", "### Leaf", "", "Text under the leaf."].join(
      "\n",
    )

    const [chunk] = await chunkMarkdown(
      `${"filler paragraph. ".repeat(120)}\n\n${source}`,
      "file-1",
    )
    expect(chunk.headingPath).toEqual([])

    const [deep] = await chunkMarkdown(source, "file-1")
    expect(deep.headingPath).toEqual(["Root"])
  })

  it("truncates an over-long heading", async () => {
    const heading = `# ${"a".repeat(HEADING_MAX_CHARS * 2)}`
    const [chunk] = await chunkMarkdown(`${heading}\n\nBody text.\n`, "file-1")

    expect(chunk.headingPath[0]).toHaveLength(HEADING_MAX_CHARS)
  })

  it("does not mistake a `#` inside a fence for a heading", async () => {
    for (const fixture of ["code-with-markdown.md", "nested-fence.md"]) {
      for (const chunk of await chunkMarkdown(readFixture(fixture), "file-1")) {
        expect(chunk.headingPath).not.toContain("Not a heading")
        expect(chunk.headingPath).not.toContain("Not a heading either")
        expect(chunk.headingPath).not.toContain("Still not a heading")
      }
    }
  })

  it("leaves the breadcrumb empty before the first heading", async () => {
    for (const chunk of await chunkMarkdown(readFixture("no-headings.md"), "file-1")) {
      expect(chunk.headingPath).toEqual([])
    }
  })
})

describe("documents with nothing to index", () => {
  it.each(["empty.md", "whitespace.md"])("returns no chunks for %s", async (fixture) => {
    expect(await chunkMarkdown(readFixture(fixture), "file-1")).toEqual([])
  })
})

// Known limitations of the splitter, asserted so they stay visible and end up in
// the README rather than being discovered during a demo. Each one is a rule the
// previous hand-written chunker enforced and this one does not.
describe("known limitations", () => {
  it("splits a table, leaving the later pieces without a header row", async () => {
    const chunks = await chunkMarkdown(readFixture("giant-table.md"), "file-1")
    const withRows = chunks.filter((chunk) => chunk.text.includes("| TBL-2031-"))

    expect(withRows.length).toBeGreaterThan(1)
    expect(
      withRows.filter((chunk) => chunk.text.includes("| Reference | Description | Owner |")),
    ).toHaveLength(1)
  })

  it("splits a fenced code block, so a chunk can carry an unclosed fence", async () => {
    const chunks = await chunkMarkdown(readFixture("giant-code.md"), "file-1")
    const unbalanced = chunks.filter((chunk) => (chunk.text.match(/```/g) ?? []).length % 2 === 1)

    expect(chunks.length).toBeGreaterThan(1)
    expect(unbalanced.length).toBeGreaterThan(0)
  })

  it("gives a chunk the breadcrumb of its first line only, even when it spans sections", async () => {
    // `deep-headings.md` runs H1 through H6 and two same-named H2 siblings, and
    // the whole file lands in one chunk. Its citation can therefore name only
    // the heading the chunk starts under, not the section a quote came from.
    const chunks = await chunkMarkdown(readFixture("deep-headings.md"), "file-1")

    expect(chunks).toHaveLength(1)
    expect(chunks[0].text).toContain("###### Depth six")
    expect(chunks[0].headingPath).toEqual(["Root heading"])
  })

  it("indexes image markup and raw HTML instead of ignoring them", async () => {
    const images = (await chunkMarkdown(readFixture("images-and-links.md"), "file-1"))
      .map((chunk) => chunk.text)
      .join("\n")
    const html = (await chunkMarkdown(readFixture("hidden-html.md"), "file-1"))
      .map((chunk) => chunk.text)
      .join("\n")

    expect(images).toContain("![inline alt](pictures/one.png)")
    expect(html).toContain("SECRET-COMMENT")
    expect(html).toContain("<script>")
  })
})

describe("the generated corpus", () => {
  // The corpus is generated, not committed: `pnpm eval:docs` writes it. On a
  // clean clone this test reports itself as skipped instead of failing.
  it.skipIf(!existsSync(CORPUS_PATH))("chunks the 300K-word document in one pass", async () => {
    const corpus = readFileSync(CORPUS_PATH, "utf8")

    const startedAt = performance.now()
    const chunks = await chunkMarkdown(corpus, "corpus")
    const elapsedMs = Math.round(performance.now() - startedAt)

    console.log(`chunked 05-encyclopedia.md into ${chunks.length} chunks in ${elapsedMs} ms`)

    expect(chunks.length).toBeGreaterThanOrEqual(700)
    expect(chunks.length).toBeLessThanOrEqual(2_500)
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(TARGET_CHARS + OVERLAP_ALLOWANCE)
    }
    // A regression guard, not the H1 timing gate — that is B3's drill on Lambda.
    expect(elapsedMs).toBeLessThan(10_000)
  })
})

/** The splitter may exceed `chunkSize` when a single separator-free run is longer. */
const OVERLAP_ALLOWANCE = 2_000

const CORPUS_PATH = fileURLToPath(
  new URL("../../../../../eval/docs/05-encyclopedia.md", import.meta.url),
)
