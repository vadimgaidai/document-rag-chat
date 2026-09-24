import { describe, expect, it } from "vitest"

import { mapWithConcurrency } from "./concurrency"

const tick = () => new Promise((resolve) => setTimeout(resolve, 1))

describe("mapWithConcurrency", () => {
  it("returns results in input order however the calls finish", async () => {
    const items = [30, 5, 20, 1, 10]

    const results = await mapWithConcurrency(items, 3, async (item) => {
      await new Promise((resolve) => setTimeout(resolve, item))
      return item * 2
    })

    expect(results).toEqual([60, 10, 40, 2, 20])
  })

  it("passes the index along with the item", async () => {
    const seen = await mapWithConcurrency(["a", "b", "c"], 2, (item, index) =>
      Promise.resolve(`${String(index)}:${item}`),
    )

    expect(seen).toEqual(["0:a", "1:b", "2:c"])
  })

  it("never runs more than `limit` calls at once", async () => {
    let inFlight = 0
    let peak = 0

    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, index) => index),
      4,
      async () => {
        inFlight += 1
        peak = Math.max(peak, inFlight)
        await tick()
        inFlight -= 1
      },
    )

    expect(peak).toBe(4)
  })

  it("rejects with the first error", async () => {
    const failure = new Error("embedding failed")

    await expect(
      mapWithConcurrency([1, 2, 3], 2, (item) =>
        item === 2 ? Promise.reject(failure) : Promise.resolve(item),
      ),
    ).rejects.toBe(failure)
  })

  it("stops taking new items once one call has failed", async () => {
    const started: number[] = []

    await expect(
      mapWithConcurrency(
        Array.from({ length: 50 }, (_, index) => index),
        2,
        async (item) => {
          started.push(item)
          await tick()
          if (item === 0) {
            throw new Error("embedding failed")
          }
          return item
        },
      ),
    ).rejects.toThrow("embedding failed")

    // The two workers each had one item in flight when the first one failed,
    // and neither picked up a third.
    expect(started).toEqual([0, 1])
  })

  it("does nothing for an empty list", async () => {
    expect(
      await mapWithConcurrency([], 4, () => Promise.reject(new Error("never called"))),
    ).toEqual([])
  })
})
