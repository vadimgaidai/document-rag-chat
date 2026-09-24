import { describe, expect, it } from "vitest"

import { objectKeysFromNotification } from "./sqs.helpers"

const notification = (...keys: string[]) =>
  JSON.stringify({
    Records: keys.map((key) => ({ s3: { object: { key } } })),
  })

describe("objectKeysFromNotification", () => {
  it("reads the key of a single upload", () => {
    expect(objectKeysFromNotification(notification("originals/file-1.md"))).toEqual([
      "originals/file-1.md",
    ])
  })

  it("reads every record of one message", () => {
    expect(
      objectKeysFromNotification(notification("originals/file-1.md", "originals/file-2.md")),
    ).toEqual(["originals/file-1.md", "originals/file-2.md"])
  })

  it("ignores the bucket's test event", () => {
    expect(
      objectKeysFromNotification(JSON.stringify({ Service: "Amazon S3", Event: "s3:TestEvent" })),
    ).toEqual([])
  })

  it("decodes a percent-encoded key", () => {
    expect(objectKeysFromNotification(notification("originals/f%C3%BCnf.md"))).toEqual([
      "originals/fünf.md",
    ])
  })

  it("decodes a space written as a plus", () => {
    expect(objectKeysFromNotification(notification("originals/my+notes.md"))).toEqual([
      "originals/my notes.md",
    ])
  })

  it("returns keys under any prefix — deciding what to do with them is the caller's job", () => {
    expect(
      objectKeysFromNotification(notification("status/1-file-1.json", "originals/file-1.md")),
    ).toEqual(["status/1-file-1.json", "originals/file-1.md"])
  })

  it("throws on a body that is not a notification", () => {
    expect(() => objectKeysFromNotification("not json")).toThrow()
  })
})
