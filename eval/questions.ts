import { z } from "zod"

import manifestJson from "./docs/manifest.json"
import questionsJson from "./questions.json"

export const QUESTION_CATEGORY = [
  "exact_identifier",
  "prose",
  "list",
  "code",
  "table",
  "single_passage",
  "multi_passage",
  "cross_document",
  "conflict",
  "unanswerable",
  "injection",
] as const

const passageSchema = z.object({
  file: z.string().min(1),
  lines: z.tuple([z.int().positive(), z.int().positive()]),
})

const questionSchema = z.object({
  id: z.string().regex(/^q\d{2}$/),
  category: z.enum(QUESTION_CATEGORY),
  question: z.string().min(1),
  expectedAnswer: z.string().min(1).nullable(),
  expectedPassages: z.array(passageSchema),
  expectAbstain: z.boolean(),
})

const rangeSchema = z.object({
  file: z.string().min(1),
  startLine: z.int().positive(),
  endLine: z.int().positive(),
})

const manifestSchema = z.object({
  facts: z.array(rangeSchema).min(1),
  injection: rangeSchema,
})

export type TExpectedPassage = z.infer<typeof passageSchema>
export type TQuestion = z.infer<typeof questionSchema>

export const QUESTIONS = z.array(questionSchema).min(1).parse(questionsJson)

const manifest = manifestSchema.parse(manifestJson)

export const MANIFEST_PASSAGES: TExpectedPassage[] = [...manifest.facts, manifest.injection].map(
  ({ file, startLine, endLine }) => ({ file, lines: [startLine, endLine] }),
)

export const CORPUS_FILES = [...new Set(MANIFEST_PASSAGES.map(({ file }) => file))].sort()
