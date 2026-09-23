import { describe, expect, it } from "vitest"

import { createQueryClient } from "./client"

describe("createQueryClient", () => {
  it("gives every caller an independent cache", () => {
    const first = createQueryClient()
    const second = createQueryClient()

    first.setQueryData(["documents"], "written during one server request")

    expect(first.getQueryData(["documents"])).toBe("written during one server request")
    expect(second.getQueryData(["documents"])).toBeUndefined()
  })
})
