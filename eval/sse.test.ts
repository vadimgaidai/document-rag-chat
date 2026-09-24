import { createServer } from "node:http"

import { afterEach, describe, expect, it } from "vitest"

import { RUN_OUTCOME, runQuestion } from "./sse"

import type { IncomingMessage, ServerResponse } from "node:http"

type TRespond = (request: IncomingMessage, response: ServerResponse) => void

const EVIDENCE = {
  marker: "c1",
  chunkId: "chunk-1",
  fileId: "8f1a3f5e-0f0a-4c7e-9b1a-2f6d4a9c1e01",
  fileName: "01-handbook.md",
  headingPath: ["Policies"],
  startLine: 38,
  endLine: 42,
}

const RESULT = {
  runId: "r1",
  generated: true,
  abstained: false,
  confidence: "supported",
  citations: [{ ...EVIDENCE, quoteStatus: "none" }],
  claims: [{ start: 0, end: 15, markers: ["c1"], cited: true }],
  unknownMarkers: [],
  quoteFailures: 0,
  flaggedMissingEvidence: false,
  integrity: [],
}

const chunk = {
  runStarted: { type: "RUN_STARTED", runId: "r1", threadId: "t1", timestamp: 1 },
  evidence: { type: "CUSTOM", name: "rag.evidence", value: { runId: "r1", evidence: [EVIDENCE] } },
  text: (delta: string) => ({ type: "TEXT_MESSAGE_CONTENT", messageId: "m1", delta }),
  step: { type: "STEP_STARTED", stepName: "generate" },
  result: { type: "CUSTOM", name: "rag.result", value: RESULT },
  runFinished: (usage: unknown) => ({ type: "RUN_FINISHED", runId: "bedrock-1", usage }),
  runError: { type: "RUN_ERROR", message: "The provided model identifier is invalid." },
}

const frames = (chunks: readonly unknown[], eol = "\n"): string =>
  chunks.map((value) => `data: ${JSON.stringify(value)}${eol}${eol}`).join("")

let close: (() => void) | undefined

const serve = async (respond: TRespond): Promise<string> => {
  const server = createServer(respond)
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))

  const address = server.address()
  if (address === null || typeof address === "string") throw new Error("the server has no port")

  close = () => {
    server.closeAllConnections()
    server.close()
  }
  return `http://127.0.0.1:${String(address.port)}`
}

const stream = (body: string, status = 200): TRespond => {
  return (request, response) => {
    expect(request.url).toBe("/api/chat")
    expect(request.method).toBe("POST")
    response.writeHead(status, { "content-type": "text/event-stream" })
    response.end(body)
  }
}

afterEach(() => {
  close?.()
  close = undefined
})

describe("runQuestion", () => {
  it("reads a complete run", async () => {
    const url = await serve(
      stream(
        frames([
          chunk.runStarted,
          chunk.evidence,
          chunk.text("17 "),
          chunk.step,
          chunk.text("minutes [c1]"),
          chunk.result,
          chunk.runFinished([{ inputTokens: 1055, outputTokens: 11, totalTokens: 1066 }]),
        ]),
      ),
    )

    const run = await runQuestion(url, "How long does a search cursor stay valid?")

    expect(run.outcome).toBe(RUN_OUTCOME.ok)
    expect(run.text).toBe("17 minutes [c1]")
    expect(run.evidence).toHaveLength(1)
    expect(run.result?.citations).toHaveLength(1)
    expect(run.usage).toEqual({ inputTokens: 1055, outputTokens: 11 })
    expect(run.resultRaw).toEqual(RESULT)
    expect(run.firstByteMs).not.toBeNull()
  })

  it("folds TanStack's own usage object into the contract shape", async () => {
    const url = await serve(
      stream(
        frames([
          chunk.result,
          chunk.runFinished({ promptTokens: 1055, completionTokens: 11, totalTokens: 1066 }),
        ]),
      ),
    )

    const run = await runQuestion(url, "usage")

    expect(run.usage).toEqual({ inputTokens: 1055, outputTokens: 11 })
  })

  it("reports usage as unknown when run-finished carried none", async () => {
    const url = await serve(stream(frames([chunk.result, { type: "RUN_FINISHED", runId: "r1" }])))

    const run = await runQuestion(url, "abstention")

    expect(run.outcome).toBe(RUN_OUTCOME.ok)
    expect(run.usage).toBe("unknown")
  })

  it("frames a stream that uses CRLF", async () => {
    const url = await serve(
      stream(frames([chunk.text("ok"), chunk.result, chunk.runFinished([])], "\r\n")),
    )

    const run = await runQuestion(url, "crlf")

    expect(run.outcome).toBe(RUN_OUTCOME.ok)
    expect(run.text).toBe("ok")
  })

  it("is incomplete when the stream ends before run-finished", async () => {
    const url = await serve(stream(frames([chunk.runStarted, chunk.evidence, chunk.text("half")])))

    const run = await runQuestion(url, "truncated")

    expect(run.outcome).toBe(RUN_OUTCOME.incomplete)
    expect(run.error).toContain("run-finished")
  })

  it("is incomplete when run-finished arrived without a result event", async () => {
    const url = await serve(stream(frames([chunk.text("orphan"), chunk.runFinished([])])))

    const run = await runQuestion(url, "no result")

    expect(run.outcome).toBe(RUN_OUTCOME.incomplete)
    expect(run.error).toContain("rag.result")
  })

  it("keeps the RUN_ERROR message on an in-band failure", async () => {
    const url = await serve(stream(frames([chunk.runStarted, chunk.runError])))

    const run = await runQuestion(url, "model gone")

    expect(run.outcome).toBe(RUN_OUTCOME.incomplete)
    expect(run.error).toBe("The provided model identifier is invalid.")
  })

  it("is a transport error on a non-2xx response", async () => {
    const url = await serve((_request, response) => {
      response.writeHead(500, { "content-type": "application/json" })
      response.end(JSON.stringify({ code: "internal", message: "boom" }))
    })

    const run = await runQuestion(url, "server down")

    expect(run.outcome).toBe(RUN_OUTCOME.transportError)
    expect(run.error).toContain("500")
  })

  it("is a transport error on a payload that is not JSON", async () => {
    const url = await serve(stream("data: {not json\n\n"))

    const run = await runQuestion(url, "garbage")

    expect(run.outcome).toBe(RUN_OUTCOME.transportError)
    expect(run.error).toContain("JSON")
  })

  it("times out a stream that never finishes", async () => {
    const url = await serve((_request, response) => {
      response.writeHead(200, { "content-type": "text/event-stream" })
      response.write(frames([chunk.runStarted]))
    })

    const run = await runQuestion(url, "hangs", { timeoutMs: 200 })

    expect(run.outcome).toBe(RUN_OUTCOME.timeout)
    expect(run.error).toContain("200 ms")
  })
})
