import { Readable } from "node:stream"

import { chat, EventType } from "@tanstack/ai"

import {
  ABSTENTION_TEXT,
  CONFIDENCE,
  RAG_EVIDENCE_EVENT,
  RAG_RESULT_EVENT,
  sourceRefSchema,
} from "@/contracts"
import type { TRagEvidenceEvent, TRagResultEvent } from "@/contracts"
import type { RetrievalService } from "@/server/modules/retrieval/retrieval.service"
import type { TEvidence } from "@/server/modules/retrieval/retrieval.types"
import type { ConfigService } from "@/server/shared/config/config.service"
import { log } from "@/server/shared/utils/log"

import { BedrockInferenceProfileAdapter } from "./chat.adapter"
import { GENERATION_MAX_TOKENS, GENERATION_TEMPERATURE, SYSTEM_PROMPT } from "./chat.constants"
import { buildEvidenceMessage, windowMessages } from "./chat.helpers"
import { verifyAnswer } from "./chat.verify"

import type { TChatInput } from "./chat.types"
import type { ChatMiddleware, StreamChunk } from "@tanstack/ai"

const abstention = (threadId: string, runId: string): AsyncIterable<StreamChunk> => {
  const messageId = `${runId}-abstention`
  const timestamp = Date.now()
  const result: TRagResultEvent = {
    runId,
    generated: false,
    abstained: true,
    confidence: CONFIDENCE.unsupported,
    citations: [],
    claims: [],
    unknownMarkers: [],
    quoteFailures: 0,
    flaggedMissingEvidence: false,
    integrity: [],
  }
  const chunks: StreamChunk[] = [
    { type: EventType.RUN_STARTED, threadId, runId, timestamp },
    { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant", timestamp },
    { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: ABSTENTION_TEXT, timestamp },
    { type: EventType.TEXT_MESSAGE_END, messageId, timestamp },
    { type: EventType.CUSTOM, name: RAG_RESULT_EVENT, value: result, timestamp },
    { type: EventType.RUN_FINISHED, threadId, runId, timestamp },
  ]

  return Readable.from(chunks)
}

const ragMiddleware = (evidence: readonly TEvidence[], startedAt: number): ChatMiddleware => {
  let answer = ""

  return {
    name: "rag",

    onStart: (ctx) => {
      const event: TRagEvidenceEvent = {
        runId: ctx.runId,
        evidence: evidence.map((item) => sourceRefSchema.parse(item)),
      }
      ctx.emitCustomEvent(RAG_EVIDENCE_EVENT, event)
    },

    onChunk: (ctx, chunk): StreamChunk[] | undefined => {
      if (chunk.type === EventType.TEXT_MESSAGE_CONTENT) answer += chunk.delta
      if (chunk.type !== EventType.RUN_FINISHED) return undefined

      const verdict = verifyAnswer(answer, evidence)
      log({
        stage: "verify",
        runId: ctx.runId,
        ms: Date.now() - startedAt,
        evidence: evidence.length,
        confidence: verdict.confidence,
        abstained: verdict.abstained,
        claims: verdict.claims.length,
        uncited: verdict.claims.filter((claim) => !claim.cited).length,
        quoteFailures: verdict.quoteFailures,
        unknownMarkers: verdict.unknownMarkers,
        integrity: verdict.integrity,
      })

      const event: TRagResultEvent = { runId: ctx.runId, generated: true, ...verdict }
      return [
        { type: EventType.CUSTOM, name: RAG_RESULT_EVENT, value: event, timestamp: Date.now() },
        chunk,
      ]
    },
  }
}

export class ChatService {
  constructor(
    private readonly config: ConfigService,
    private readonly retrieval: RetrievalService,
  ) {}

  async answer({
    messages,
    threadId,
    runId,
    abortController,
  }: TChatInput): Promise<AsyncIterable<StreamChunk>> {
    const startedAt = Date.now()
    const { history, question } = windowMessages(messages)
    const evidence = await this.retrieval.retrieve(question)

    if (evidence.length === 0) {
      log({ stage: "chat", runId, ms: Date.now() - startedAt, evidence: 0, generated: false })
      return abstention(threadId, runId)
    }

    return chat({
      adapter: new BedrockInferenceProfileAdapter(this.config.generationModelId, {
        region: this.config.region,
        auth: "sigv4",
      }),
      messages: [...history, { role: "user", content: buildEvidenceMessage(question, evidence) }],
      systemPrompts: [SYSTEM_PROMPT],
      middleware: [ragMiddleware(evidence, startedAt)],

      modelOptions: {
        max_completion_tokens: GENERATION_MAX_TOKENS,
        temperature: GENERATION_TEMPERATURE,
      },
      threadId,
      runId,
      abortController,
    })
  }
}
