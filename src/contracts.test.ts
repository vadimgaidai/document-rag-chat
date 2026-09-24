import { describe, expect, it } from "vitest"

import { MAX_FILE_BYTES, uploadRequestSchema } from "./contracts"

const request = (name: string, sizeBytes = 1_024) =>
  uploadRequestSchema.safeParse({ name, sizeBytes })

describe("uploadRequestSchema", () => {
  it("accepts a Markdown file", () => {
    expect(request("notes.md").success).toBe(true)
  })

  it("accepts the extension in any case", () => {
    expect(request("NOTES.MD").success).toBe(true)
  })

  it("rejects another extension", () => {
    expect(request("notes.txt").success).toBe(false)
  })

  it("rejects a name carrying a path separator", () => {
    expect(request("../notes.md").success).toBe(false)
    expect(request("dir\\notes.md").success).toBe(false)
  })

  it("rejects an empty name and one over 255 characters", () => {
    expect(request("").success).toBe(false)
    expect(request(`${"a".repeat(253)}.md`).success).toBe(false)
  })

  it("accepts a file exactly at the size limit", () => {
    expect(request("notes.md", MAX_FILE_BYTES).success).toBe(true)
  })

  it("rejects an empty file and one over the size limit", () => {
    expect(request("notes.md", 0).success).toBe(false)
    expect(request("notes.md", MAX_FILE_BYTES + 1).success).toBe(false)
  })
})
