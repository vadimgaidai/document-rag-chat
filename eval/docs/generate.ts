// Generates the one corpus the whole project measures itself against: five
// markdown documents plus `manifest.json`, written next to this file.
//
//     pnpm eval:docs
//
// Everything here is deterministic — a seeded PRNG, no dates read from the
// clock, no network — so a second run leaves `git status` clean. B3's ingestion
// drills, B5's smoke test and B8's eval all read these files and the manifest
// rather than shipping corpora of their own.

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import {
  CONFLICTS,
  INJECTION_BLOCK,
  INJECTION_DOC,
  INJECTION_POSITION,
  PLANTED_FACTS,
  UNANSWERABLE,
} from "./facts"
import {
  PACKS,
  PEOPLE,
  REGIONS,
  SHARED_SECTIONS,
  SHARED_SUBSECTIONS,
  SYSTEMS,
  TEAMS,
} from "./packs"

import type { TFactKind, TPlantedFact } from "./facts"
import type { TPack } from "./packs"

const SEED = 0x5eed1b01

/** Word targets per document. Documents 1–4 sit in the 25K–60K band; the last
 *  one is the 300K-word stress document the chunker and the drills are timed on. */
const WORD_TARGETS = [26_000, 32_000, 41_000, 54_000, 302_000] as const

/** Safety margin under the chunker's `MAX_BLOCK_CHARS` (12,000). */
const MAX_BLOCK_CHARS = 8_000

/** The large document uses longer sections so its chunks pack close to the
 *  chunker's target size instead of ending early at every heading. */
const BLOCKS_PER_SECTION: readonly (readonly [number, number])[] = [
  [2, 5],
  [2, 5],
  [2, 5],
  [2, 5],
  [12, 20],
]

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

/** mulberry32: 32-bit state, no dependencies, identical output everywhere. */
const mulberry32 = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

class Random {
  private readonly next: () => number

  constructor(seed: number) {
    this.next = mulberry32(seed)
  }

  float() {
    return this.next()
  }

  int(min: number, max: number) {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  pick<T>(values: readonly T[]): T {
    return values[Math.floor(this.next() * values.length)]
  }
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

const SLOT_PATTERN = /\{(\w+)\}/g

const fill = (template: string, slots: Readonly<Record<string, string>>) =>
  template.replace(SLOT_PATTERN, (_match, key: string) => slots[key] ?? `{${key}}`)

const REF_PREFIXES = ["INV", "REQ", "DOC", "TKT", "CHG"] as const

const pad = (value: number, width: number) => String(value).padStart(width, "0")

const slotsFor = (random: Random, pack: TPack): Record<string, string> => ({
  name: random.pick(PEOPLE),
  team: random.pick(TEAMS),
  system: random.pick(SYSTEMS),
  region: random.pick(REGIONS),
  term: random.pick(pack.terms),
  n: String(random.int(3, 96)),
  day: String(random.int(1, 28)),
  pct: `${random.int(2, 48)}%`,
  ms: String(random.int(40, 2_400)),
  amount: `${(random.int(1, 40) * 250).toLocaleString("en-US")} EUR`,
  date: `20${random.int(28, 32)}-${pad(random.int(1, 12), 2)}-${pad(random.int(1, 28), 2)}`,
  version: `${random.int(1, 6)}.${random.int(0, 19)}`,
  ref: `${random.pick(REF_PREFIXES)}-${random.int(2028, 2032)}-${pad(random.int(1, 9_999), 4)}`,
})

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

type TBlockKind = "heading" | "paragraph" | "other"

type TBlockDraft = {
  markdown: string
  kind: TBlockKind
  /** Set on the blocks the manifest has to locate. */
  tag?: string
}

const heading = (depth: number, text: string): TBlockDraft => ({
  markdown: `${"#".repeat(depth)} ${text}`,
  kind: "heading",
})

const paragraph = (random: Random, pack: TPack): TBlockDraft => {
  const sentences: string[] = []
  let previous = -1
  const count = random.int(3, 6)
  for (let index = 0; index < count; index += 1) {
    let choice = random.int(0, pack.sentences.length - 1)
    if (choice === previous) choice = (choice + 1) % pack.sentences.length
    previous = choice
    sentences.push(fill(pack.sentences[choice], slotsFor(random, pack)))
  }
  return { markdown: sentences.join(" "), kind: "paragraph" }
}

const linkParagraph = (random: Random, pack: TPack): TBlockDraft => {
  const slots = slotsFor(random, pack)
  const body = fill(random.pick(pack.sentences), slots)
  const target = slugify(slots.term)
  return {
    markdown: `${body} See [the ${slots.term} procedure](https://example.invalid/${target}) for the full text.`,
    kind: "paragraph",
  }
}

/** Lead-in paragraph and the list itself: two markdown blocks, so every draft
 *  in this file maps to exactly one mdast node. */
const listBlocks = (random: Random, pack: TPack): TBlockDraft[] => {
  const intro = fill(random.pick(pack.listIntros), slotsFor(random, pack))
  const items: string[] = []
  const count = random.int(3, 6)
  for (let index = 0; index < count; index += 1) {
    items.push(`- ${fill(random.pick(pack.listItems), slotsFor(random, pack))}`)
  }
  return [
    { markdown: intro, kind: "paragraph" },
    { markdown: items.join("\n"), kind: "other" },
  ]
}

const tableBlock = (random: Random, pack: TPack): TBlockDraft => {
  const rows: string[] = [`| ${pack.tableHeaders.join(" | ")} |`, "| --- | --- | --- |"]
  const count = random.int(3, 7)
  for (let index = 0; index < count; index += 1) {
    const slots = slotsFor(random, pack)
    rows.push(`| ${pack.tableRow.map((cell) => fill(cell, slots)).join(" | ")} |`)
  }
  return { markdown: rows.join("\n"), kind: "other" }
}

const codeBlock = (random: Random, pack: TPack): TBlockDraft => {
  const slots = slotsFor(random, pack)
  const body = pack.codeLines.map((line) => fill(line, slots))
  return {
    markdown: ["```" + pack.codeLang, ...body, "```"].join("\n"),
    kind: "other",
  }
}

const quoteBlock = (random: Random, pack: TPack): TBlockDraft => ({
  markdown: `> ${fill(random.pick(pack.quotes), slotsFor(random, pack))}`,
  kind: "other",
})

const imageBlock = (random: Random, pack: TPack): TBlockDraft => {
  const slots = slotsFor(random, pack)
  const slug = slugify(slots.term)
  return { markdown: `![Diagram of the ${slots.term}](images/${slug}.png)`, kind: "other" }
}

/** A reference-style image plus its definition — two blocks the chunker has to
 *  treat differently: the image is stripped, the definition is skipped. */
const referenceImageBlocks = (random: Random, pack: TPack): TBlockDraft[] => {
  const slots = slotsFor(random, pack)
  const slug = slugify(slots.term)
  const label = `fig-${slug}-${random.int(100, 999)}`
  return [
    { markdown: `![Overview of the ${slots.term}][${label}]`, kind: "other" },
    { markdown: `[${label}]: images/${slug}-overview.png "${slots.term}"`, kind: "other" },
  ]
}

const contentBlocks = (random: Random, pack: TPack): TBlockDraft[] => {
  const roll = random.float()
  if (roll < 0.58) return [paragraph(random, pack)]
  if (roll < 0.71) return listBlocks(random, pack)
  if (roll < 0.81) return [tableBlock(random, pack)]
  if (roll < 0.88) return [codeBlock(random, pack)]
  if (roll < 0.92) return [quoteBlock(random, pack)]
  if (roll < 0.95) return [linkParagraph(random, pack)]
  if (roll < 0.98) return [imageBlock(random, pack)]
  return referenceImageBlocks(random, pack)
}

// ---------------------------------------------------------------------------
// Fact blocks
// ---------------------------------------------------------------------------

const factBlock = (fact: TPlantedFact): TBlockDraft => ({
  markdown: renderFact(fact.kind, fact),
  kind: fact.kind === "prose" ? "paragraph" : "other",
  tag: fact.id,
})

const renderFact = (kind: TFactKind, fact: TPlantedFact): string => {
  switch (kind) {
    case "prose":
      return [
        `Record ${fact.ref} fixes the ${fact.label.toLowerCase()} at ${fact.value}.`,
        `The figure was approved by ${fact.owner} on ${fact.date} and stays in force until it is superseded in writing.`,
      ].join(" ")
    case "list":
      return [
        `- Reference: ${fact.ref}`,
        `- ${fact.label}: ${fact.value}`,
        `- Approved by ${fact.owner} on ${fact.date}`,
      ].join("\n")
    case "table":
      return [
        `| Reference | ${fact.label} | Approved |`,
        "| --- | --- | --- |",
        `| ${fact.ref} | ${fact.value} | ${fact.owner}, ${fact.date} |`,
      ].join("\n")
    case "code":
      return [
        "```ini",
        `# ${fact.ref} — approved by ${fact.owner} on ${fact.date}`,
        `${fact.key} = ${fact.value}`,
        "```",
      ].join("\n")
  }
}

const distractorBlock = (fact: TPlantedFact): TBlockDraft => ({
  markdown: [
    `A neighbouring record, ${fact.distractorRef}, reports a ${fact.label.toLowerCase()} of ${fact.distractorValue} for the preceding period.`,
    "It covers a different scope and is kept here only for comparison.",
  ].join(" "),
  kind: "paragraph",
})

// ---------------------------------------------------------------------------
// Document assembly
// ---------------------------------------------------------------------------

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length

const sectionHeadings = (pack: TPack) => [...pack.sections, ...SHARED_SECTIONS]
const subsectionHeadings = (pack: TPack) => [...pack.subsections, ...SHARED_SUBSECTIONS]

const buildBlocks = (random: Random, pack: TPack, wordTarget: number, docIndex: number) => {
  const [minBlocks, maxBlocks] = BLOCKS_PER_SECTION[docIndex]
  const blocks: TBlockDraft[] = [heading(1, pack.title)]
  let words = countWords(pack.title)

  const push = (drafts: TBlockDraft[]) => {
    for (const draft of drafts) {
      blocks.push(draft)
      words += countWords(draft.markdown)
    }
  }

  let part = 1
  while (words < wordTarget) {
    push([heading(2, `${random.pick(sectionHeadings(pack))} (part ${part})`)])
    const bodyCount = random.int(minBlocks, maxBlocks)
    for (let index = 0; index < bodyCount; index += 1) push(contentBlocks(random, pack))

    const subsections = random.int(0, 2)
    for (let index = 0; index < subsections; index += 1) {
      push([heading(3, random.pick(subsectionHeadings(pack)))])
      const subCount = random.int(minBlocks, maxBlocks)
      for (let inner = 0; inner < subCount; inner += 1) push(contentBlocks(random, pack))
    }
    part += 1
  }

  return blocks
}

/** Inserts a block near a relative position, always before a plain paragraph so
 *  it never lands between a heading and the text it introduces. */
const insertNearPosition = (blocks: TBlockDraft[], position: number, block: TBlockDraft) => {
  const target = Math.min(blocks.length - 1, Math.max(1, Math.round(position * blocks.length)))
  let index = target
  while (index < blocks.length && blocks[index].kind !== "paragraph") index += 1
  if (index >= blocks.length) {
    index = target
    while (index > 1 && blocks[index].kind !== "paragraph") index -= 1
  }
  blocks.splice(index, 0, block)
}

type TInsertion = { position: number; order: string; block: TBlockDraft }

const plantInto = (blocks: TBlockDraft[], docIndex: number) => {
  const insertions: TInsertion[] = []

  for (const fact of PLANTED_FACTS.filter((candidate) => candidate.doc === docIndex)) {
    insertions.push({ position: fact.position, order: `${fact.id}-fact`, block: factBlock(fact) })
    insertions.push({
      position: fact.distractorPosition,
      order: `${fact.id}-distractor`,
      block: distractorBlock(fact),
    })
  }

  if (docIndex === INJECTION_DOC) {
    insertions.push({
      position: INJECTION_POSITION,
      order: "injection",
      block: { markdown: INJECTION_BLOCK, kind: "paragraph", tag: "injection" },
    })
  }

  // Descending, so an earlier insertion never shifts the index of a later one.
  insertions.sort((a, b) => b.position - a.position || a.order.localeCompare(b.order))
  for (const insertion of insertions) {
    insertNearPosition(blocks, insertion.position, insertion.block)
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

type TRange = { startLine: number; endLine: number }

type TRendered = {
  text: string
  words: number
  maxBlockChars: number
  ranges: ReadonlyMap<string, TRange>
}

const render = (blocks: readonly TBlockDraft[]): TRendered => {
  const lines: string[] = []
  const ranges = new Map<string, TRange>()
  let maxBlockChars = 0

  for (const block of blocks) {
    if (lines.length > 0) lines.push("")
    const startLine = lines.length + 1
    lines.push(...block.markdown.split("\n"))
    maxBlockChars = Math.max(maxBlockChars, block.markdown.length)
    if (block.tag) ranges.set(block.tag, { startLine, endLine: lines.length })
  }

  const text = `${lines.join("\n")}\n`
  return { text, words: countWords(text), maxBlockChars, ranges }
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

type TManifestFact = {
  id: string
  file: string
  startLine: number
  endLine: number
  kind: TFactKind
  value: string
  question: string
  answer: string
}

type TManifest = {
  seed: number
  facts: TManifestFact[]
  conflicts: { factA: string; factB: string }[]
  injection: { file: string; startLine: number; endLine: number }
  unanswerable: { question: string }[]
}

const requireRange = (ranges: ReadonlyMap<string, TRange>, tag: string, file: string): TRange => {
  const range = ranges.get(tag)
  if (!range) throw new Error(`${file}: block "${tag}" was never rendered`)
  return range
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const outputDirectory = fileURLToPath(new URL(".", import.meta.url))

const facts: TManifestFact[] = []
let injection: TManifest["injection"] | undefined

for (const [docIndex, pack] of PACKS.entries()) {
  const random = new Random(SEED + docIndex * 7_919)
  const blocks = buildBlocks(random, pack, WORD_TARGETS[docIndex], docIndex)
  plantInto(blocks, docIndex)

  const file = `${pack.slug}.md`
  const { text, words, maxBlockChars, ranges } = render(blocks)

  if (maxBlockChars > MAX_BLOCK_CHARS) {
    throw new Error(
      `${file}: a block is ${maxBlockChars} characters, over the ${MAX_BLOCK_CHARS} limit`,
    )
  }

  const [minWords, maxWords] =
    docIndex === PACKS.length - 1 ? [300_000, Number.POSITIVE_INFINITY] : [25_000, 60_000]
  if (words < minWords || words > maxWords) {
    throw new Error(`${file}: ${words} words is outside the expected ${minWords}–${maxWords} range`)
  }

  const documentLines = text.split("\n")
  for (const fact of PLANTED_FACTS.filter((candidate) => candidate.doc === docIndex)) {
    const range = requireRange(ranges, fact.id, file)
    const planted = documentLines.slice(range.startLine - 1, range.endLine).join("\n")
    if (!planted.includes(fact.value)) {
      throw new Error(
        `${file}: fact ${fact.id} is not on lines ${range.startLine}–${range.endLine}`,
      )
    }
    facts.push({
      id: fact.id,
      file,
      startLine: range.startLine,
      endLine: range.endLine,
      kind: fact.kind,
      value: fact.value,
      question: fact.question,
      answer: fact.answer,
    })
  }

  if (docIndex === INJECTION_DOC) {
    const range = requireRange(ranges, "injection", file)
    injection = { file, startLine: range.startLine, endLine: range.endLine }
  }

  writeFileSync(new URL(file, import.meta.url), text, "utf8")
  console.log(`${file.padEnd(20)} ${words.toLocaleString("en-US").padStart(9)} words`)
}

if (!injection) throw new Error("the injection block was never planted")

const manifest: TManifest = {
  seed: SEED,
  facts,
  conflicts: CONFLICTS.map((conflict) => ({ ...conflict })),
  injection,
  unanswerable: UNANSWERABLE.map((question) => ({ question })),
}

writeFileSync(
  new URL("manifest.json", import.meta.url),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
)

console.log(`manifest.json       ${String(facts.length).padStart(9)} facts`)
console.log(`written to ${outputDirectory}`)
