import { describe, expect, it } from "vitest"

import {
  chunksKey,
  fileIdFromOriginalKey,
  isStatusKeyOf,
  originalKey,
  statusKey,
} from "./documents.keys"

describe("originalKey", () => {
  it("is reversed by fileIdFromOriginalKey", () => {
    const fileId = "0b6d2a1e-6c31-4f6a-9c2c-9f1e2a3b4c5d"

    expect(fileIdFromOriginalKey(originalKey(fileId))).toBe(fileId)
  })
})

describe("chunksKey", () => {
  it("puts one file's chunks under its own folder", () => {
    expect(chunksKey("file-1")).toBe("index/file-1/chunks.jsonl")
  })
})

describe("statusKey", () => {
  it("sorts a newer upload before an older one", () => {
    const older = statusKey("file-1", "2026-09-01T10:00:00.000Z")
    const newer = statusKey("file-2", "2026-09-02T10:00:00.000Z")

    expect([older, newer].sort()).toEqual([newer, older])
  })

  it("pads every key to the same length so the order is lexicographic", () => {
    expect(statusKey("file-1", "2026-09-01T10:00:00.000Z")).toHaveLength(
      statusKey("file-2", "1999-01-01T00:00:00.000Z").length,
    )
  })
})

describe("isStatusKeyOf", () => {
  const uploadedAt = "2026-09-01T10:00:00.000Z"

  it("matches the status key of its own file", () => {
    expect(isStatusKeyOf(statusKey("file-1", uploadedAt), "file-1")).toBe(true)
  })

  it("rejects the status key of another file", () => {
    expect(isStatusKeyOf(statusKey("file-2", uploadedAt), "file-1")).toBe(false)
  })

  it("rejects a key outside the status prefix", () => {
    expect(isStatusKeyOf("index/file-1/chunks.jsonl", "file-1")).toBe(false)
  })

  it("rejects a file id that is only a suffix of another", () => {
    expect(isStatusKeyOf(statusKey("older-file-1", uploadedAt), "file-1")).toBe(false)
  })
})

describe("fileIdFromOriginalKey", () => {
  it("reads the file id of an original", () => {
    expect(fileIdFromOriginalKey("originals/file-1.md")).toBe("file-1")
  })

  it("rejects another prefix", () => {
    expect(fileIdFromOriginalKey("index/file-1.md")).toBeNull()
  })

  it("rejects another extension", () => {
    expect(fileIdFromOriginalKey("originals/file-1.txt")).toBeNull()
  })

  it("rejects a nested key", () => {
    expect(fileIdFromOriginalKey("originals/nested/file-1.md")).toBeNull()
  })

  it("rejects an empty file id", () => {
    expect(fileIdFromOriginalKey("originals/.md")).toBeNull()
  })
})
