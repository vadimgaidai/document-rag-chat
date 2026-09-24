import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"
import { z } from "zod"

import { createRetrievalService } from "@/server/app"

import { EVIDENCE_MAX } from "./retrieval.constants"

// Needs the deployed corpus: every `eval/docs` file uploaded and `ready`, plus
// the Lambda's env vars and an AWS profile in the shell.
const CORPUS_FILE = "05-encyclopedia.md"
const CALL_TIMEOUT_MS = 60_000

const manifestSchema = z.object({
  facts: z.array(
    z.object({
      id: z.string(),
      file: z.string(),
      startLine: z.number().int().positive(),
      endLine: z.number().int().positive(),
      question: z.string(),
    }),
  ),
  unanswerable: z.array(z.object({ question: z.string() })),
})

const manifest = manifestSchema.parse(
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL("../../../../eval/docs/manifest.json", import.meta.url)),
      "utf8",
    ),
  ),
)

const facts = manifest.facts.filter((fact) => fact.file === CORPUS_FILE)

describe.skipIf(!process.env.RUN_AWS_TESTS)("retrieve", () => {
  it.each(facts)(
    "finds the planted fact $id",
    async (fact) => {
      const evidence = await createRetrievalService().retrieve(fact.question)

      expect(evidence.length).toBeGreaterThan(0)
      expect(evidence.length).toBeLessThanOrEqual(EVIDENCE_MAX)

      const scores = evidence.map(({ score }) => score)
      expect(scores).toEqual([...scores].sort((left, right) => right - left))

      // hit@5, the same rule B8 measures: one of the five must cover the
      // planted lines in the file that holds them.
      const hit = evidence.some(
        (item) =>
          item.fileName === fact.file &&
          item.startLine <= fact.endLine &&
          item.endLine >= fact.startLine,
      )
      expect(hit).toBe(true)
    },
    CALL_TIMEOUT_MS,
  )

  it(
    "returns fewer chunks for an off-topic question than for a planted one",
    async () => {
      const retrieval = createRetrievalService()
      const planted = await retrieval.retrieve(facts[0].question)
      const offTopic = await retrieval.retrieve(manifest.unanswerable[0].question)

      expect(offTopic.length).toBeLessThan(planted.length)
    },
    CALL_TIMEOUT_MS * 2,
  )
})
