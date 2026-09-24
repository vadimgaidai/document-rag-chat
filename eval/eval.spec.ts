import { execFileSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { DOCUMENT_STATUS, documentListResponseSchema } from "@/contracts"
import type { TDocument } from "@/contracts"

import { evaluate } from "./metrics"
import { CORPUS_FILES, QUESTIONS } from "./questions"
import { renderReport } from "./report"
import { RUN_OUTCOME, runQuestion } from "./sse"

import type { TExpectedPassage } from "./questions"
import type { TEvalRow } from "./report"

const baseUrl = process.env.EVAL_BASE_URL ?? ""
const rerankScoreFloor = process.env.RERANK_SCORE_FLOOR ?? "not recorded (pass RERANK_SCORE_FLOOR)"
const previousRerankScoreFloor = process.env.RERANK_SCORE_FLOOR_PREVIOUS

const PAGE_LIMIT = 100
const RESULTS_PATH = fileURLToPath(new URL("./results.md", import.meta.url))

const startedAt = new Date()
const rows: TEvalRow[] = []
const corpus: TDocument[] = []

const commitSha = () => {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim()
  } catch {
    return "unknown"
  }
}

const listDocuments = async () => {
  const documents: TDocument[] = []
  let cursor: string | null = null

  do {
    const url = new URL("/api/files", baseUrl)
    url.searchParams.set("limit", String(PAGE_LIMIT))
    if (cursor) url.searchParams.set("cursor", cursor)

    const response = await fetch(url)
    if (!response.ok) throw new Error(`GET ${url.pathname} answered ${String(response.status)}`)

    const page = documentListResponseSchema.parse(await response.json())
    documents.push(...page.documents)
    cursor = page.nextCursor
  } while (cursor)

  return documents
}

const corpusProblems = (documents: readonly TDocument[]) =>
  CORPUS_FILES.flatMap((name) => {
    const copies = documents.filter((document) => document.name === name)
    if (copies.length === 0) return [`${name}: missing`]
    if (copies.length > 1) return [`${name}: ${String(copies.length)} copies`]

    const [document] = copies
    return document.status === DOCUMENT_STATUS.ready ? [] : [`${name}: status ${document.status}`]
  })

const fileIdOf = (name: string) => {
  const fileId = corpus.find((document) => document.name === name)?.fileId
  if (!fileId) throw new Error(`No fileId for ${name}`)
  return fileId
}

const resolvePassages = (passages: readonly TExpectedPassage[]) =>
  passages.map(({ file, lines }) => ({ fileId: fileIdOf(file), lines }))

describe.skipIf(baseUrl === "")(`eval against ${baseUrl}`, () => {
  beforeAll(async () => {
    const documents = await listDocuments()
    const problems = corpusProblems(documents)

    if (problems.length > 0) {
      throw new Error(
        `The eval corpus is not clean. Reset it (.planning/aws/SETUP.md Step 12), upload the files from eval/docs/ once and wait until all are ready.\n  ${problems.join("\n  ")}`,
      )
    }

    corpus.push(
      ...CORPUS_FILES.flatMap((name) => documents.filter((document) => document.name === name)),
    )
  })

  for (const question of QUESTIONS) {
    it(`${question.id} ${question.question}`, async () => {
      const run = await runQuestion(baseUrl, question.question)
      const expected = resolvePassages(question.expectedPassages)
      const metrics = evaluate(question, run, expected)

      rows.push({ question, run, metrics, expected })
      console.log(
        `${question.id} ${run.outcome} ${String(run.totalMs)} ms ${metrics.stage}${run.error ? ` — ${run.error}` : ""}`,
      )

      expect(run.outcome).toBe(RUN_OUTCOME.ok)
    })
  }

  afterAll(() => {
    if (rows.length === 0) return

    const report = renderReport({
      startedAt,
      baseUrl,
      commit: commitSha(),
      rerankScoreFloor,
      previousRerankScoreFloor,
      corpus,
      rows,
    })
    writeFileSync(RESULTS_PATH, report, "utf8")
    console.log(`\nWrote ${RESULTS_PATH} — fill the three manual columns before committing.`)
  })
})
