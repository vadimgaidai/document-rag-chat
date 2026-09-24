import { describe, expect, it } from "vitest"

import { MANIFEST_PASSAGES, QUESTION_CATEGORY, QUESTIONS } from "./questions"

import type { TExpectedPassage } from "./questions"

const MIN_QUESTIONS = 15
const LARGE_DOCUMENT = "05-encyclopedia.md"

const key = (passage: TExpectedPassage) =>
  `${passage.file}:${String(passage.lines[0])}-${String(passage.lines[1])}`

const expectedPassages = QUESTIONS.flatMap((question) => question.expectedPassages)
const byCategory = (category: string) => QUESTIONS.filter((q) => q.category === category)

describe("questions.json", () => {
  it(`holds at least ${String(MIN_QUESTIONS)} questions with unique ids`, () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(MIN_QUESTIONS)
    expect(new Set(QUESTIONS.map((question) => question.id)).size).toBe(QUESTIONS.length)
  })

  it("covers every category", () => {
    for (const category of QUESTION_CATEGORY) {
      expect(byCategory(category).length, category).toBeGreaterThan(0)
    }
  })

  it("asks enough of each kind the spec names", () => {
    expect(byCategory("multi_passage").length).toBeGreaterThanOrEqual(2)
    expect(byCategory("cross_document").length).toBeGreaterThanOrEqual(1)
    expect(byCategory("conflict").length).toBeGreaterThanOrEqual(1)
    expect(byCategory("injection").length).toBeGreaterThanOrEqual(1)
    expect(QUESTIONS.filter((question) => question.expectAbstain).length).toBeGreaterThanOrEqual(2)
  })

  it("reaches the beginning, the middle and the end of the large document", () => {
    const asked = new Set(expectedPassages.map(key))
    const planted = MANIFEST_PASSAGES.filter((passage) => passage.file === LARGE_DOCUMENT)

    expect(planted.length).toBeGreaterThanOrEqual(3)
    for (const passage of planted) {
      expect(asked.has(key(passage)), key(passage)).toBe(true)
    }
  })

  it("expects only passages the manifest planted", () => {
    const planted = new Set(MANIFEST_PASSAGES.map(key))
    for (const passage of expectedPassages) {
      expect(planted.has(key(passage)), key(passage)).toBe(true)
    }
  })

  it("asks a question that expects an abstention to expect nothing else", () => {
    for (const question of QUESTIONS.filter((candidate) => candidate.expectAbstain)) {
      expect(question.expectedAnswer, question.id).toBeNull()
      expect(question.expectedPassages, question.id).toHaveLength(0)
    }
  })

  it("gives every answerable question an expected answer and a passage", () => {
    for (const question of QUESTIONS.filter((candidate) => !candidate.expectAbstain)) {
      expect(question.expectedAnswer, question.id).not.toBeNull()
      expect(question.expectedPassages.length, question.id).toBeGreaterThan(0)
    }
  })
})
