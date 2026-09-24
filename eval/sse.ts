import { randomUUID } from "node:crypto"

import { EventType, toSpecTokenUsage } from "@tanstack/ai/client"
import { fetchServerSentEvents, StreamTruncatedError } from "@tanstack/ai-client"

import {
  RAG_EVIDENCE_EVENT,
  RAG_RESULT_EVENT,
  ragEvidenceEventSchema,
  ragResultEventSchema,
  usageSchema,
} from "@/contracts"
import type { TRagResultEvent, TSourceRef, TUsage } from "@/contracts"

import type { RunFinishedEvent } from "@tanstack/ai/client"

const DEFAULT_TIMEOUT_MS = 120_000

export const RUN_OUTCOME = {
  ok: "ok",
  incomplete: "incomplete",
  timeout: "timeout",
  transportError: "transport_error",
} as const

export type TRunOutcome = (typeof RUN_OUTCOME)[keyof typeof RUN_OUTCOME]

export type TRunResult = {
  outcome: TRunOutcome
  text: string
  evidence: TSourceRef[] | null
  result: TRagResultEvent | null
  resultRaw: unknown
  usage: TUsage | "unknown"
  firstByteMs: number | null
  totalMs: number
  error?: string
}

const usageOf = (usage: RunFinishedEvent["usage"]): TUsage | "unknown" => {
  const spec = Array.isArray(usage) ? usage[0] : usage && toSpecTokenUsage(usage).usage[0]
  const parsed = usageSchema.safeParse(spec)
  return parsed.success ? parsed.data : "unknown"
}

export const runQuestion = async (
  baseUrl: string,
  question: string,
  { timeoutMs = DEFAULT_TIMEOUT_MS } = {},
): Promise<TRunResult> => {
  const startedAt = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const run = {
    text: "",
    evidence: null as TSourceRef[] | null,
    result: null as TRagResultEvent | null,
    resultRaw: undefined as unknown,
    usage: "unknown" as TUsage | "unknown",
    firstByteMs: null as number | null,
  }
  let finished = false
  let error: string | undefined
  let transport: string | undefined

  const finish = (outcome: TRunOutcome, reason = error): TRunResult => ({
    ...run,
    outcome,
    totalMs: Date.now() - startedAt,
    error: reason,
  })

  const connection = fetchServerSentEvents(new URL("/api/chat", baseUrl).href, {
    reconnect: { maxAttempts: 0 },
  })
  const chunks = connection.connect(
    [{ role: "user", content: question }],
    undefined,
    controller.signal,
    { threadId: `eval-thread-${randomUUID()}`, runId: `eval-run-${randomUUID()}` },
  )

  try {
    for await (const chunk of chunks) {
      run.firstByteMs ??= Date.now() - startedAt

      switch (chunk.type) {
        case EventType.TEXT_MESSAGE_CONTENT:
          run.text += chunk.delta
          break
        case EventType.CUSTOM:
          if (chunk.name === RAG_EVIDENCE_EVENT) {
            const event = ragEvidenceEventSchema.safeParse(chunk.value)
            if (event.success) run.evidence = event.data.evidence
            else error ??= "rag.evidence did not match the contract"
          }
          if (chunk.name === RAG_RESULT_EVENT) {
            run.resultRaw = chunk.value
            const event = ragResultEventSchema.safeParse(chunk.value)
            if (event.success) run.result = event.data
            else error ??= "rag.result did not match the contract"
          }
          break
        case EventType.RUN_FINISHED:
          finished = true
          run.usage = usageOf(chunk.usage)
          break
        case EventType.RUN_ERROR:
          error = chunk.message
          break
      }
    }
  } catch (cause) {
    if (cause instanceof StreamTruncatedError) error ??= "the stream ended mid-event"
    else transport = cause instanceof Error ? cause.message : String(cause)
  } finally {
    clearTimeout(timer)
  }

  if (controller.signal.aborted) {
    return finish(RUN_OUTCOME.timeout, `no terminal event within ${String(timeoutMs)} ms`)
  }
  if (transport) return finish(RUN_OUTCOME.transportError, transport)
  if (finished && run.result) return finish(RUN_OUTCOME.ok)

  return finish(
    RUN_OUTCOME.incomplete,
    error ??
      (finished ? "the stream carried no rag.result" : "the stream ended before run-finished"),
  )
}
