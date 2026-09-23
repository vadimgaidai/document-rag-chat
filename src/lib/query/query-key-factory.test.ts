import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { createQueryKeyFactory } from "./query-key-factory"

const documentKeys = createQueryKeyFactory("documents", (all) => ({
  list: (status: string) => [...all(), "list", status] as const,
  detail: (id: string) => [...all(), "detail", id] as const,
}))

describe("createQueryKeyFactory", () => {
  it("separates results that were fetched with different parameters", () => {
    expect(documentKeys.list("indexed")).not.toEqual(documentKeys.list("pending"))
    expect(documentKeys.detail("doc-1")).not.toEqual(documentKeys.detail("doc-2"))
  })

  it("invalidates every key of the entity from the shared prefix, and nothing else", async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(documentKeys.list("indexed"), [])
    queryClient.setQueryData(documentKeys.detail("doc-1"), {})
    queryClient.setQueryData(["conversations", "list"], [])

    await queryClient.invalidateQueries({ queryKey: documentKeys.all() })

    const invalidated = queryClient
      .getQueryCache()
      .getAll()
      .filter((query) => query.state.isInvalidated)
      .map((query) => query.queryKey)

    expect(invalidated).toHaveLength(2)
    expect(invalidated).toEqual(
      expect.arrayContaining([documentKeys.list("indexed"), documentKeys.detail("doc-1")]),
    )
  })
})
