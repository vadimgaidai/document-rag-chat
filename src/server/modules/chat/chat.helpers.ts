import { API_ERROR_CODE, MAX_HISTORY_CHARS, MAX_QUESTION_CHARS } from "@/contracts"
import type { TApiErrorCode } from "@/contracts"
import { HEADING_SEPARATOR } from "@/server/modules/ingestion/ingestion.constants"
import type { TEvidence } from "@/server/modules/retrieval/retrieval.types"

import type { ModelMessage, UIMessage } from "@tanstack/ai"

export class ChatRequestError extends Error {
  constructor(
    readonly code: TApiErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "ChatRequestError"
  }
}

type TTurn = { user: string; assistant: string[] }

const EVIDENCE_BLOCK =
  /^Evidence \[c\d+\] \([^\n]*\):[\s\S]*?(?=\n\nEvidence \[c\d+\] \(|\n\nQuestion:|\s*(?![\s\S]))/gm

const textOf = (message: UIMessage | ModelMessage): string => {
  if ("parts" in message) {
    return message.parts.map((part) => (part.type === "text" ? part.content : "")).join("")
  }
  if (typeof message.content === "string") {
    return message.content
  }
  return (message.content ?? []).map((part) => (part.type === "text" ? part.content : "")).join("")
}

export const stripEvidence = (text: string) => text.replace(EVIDENCE_BLOCK, "").trim()

const groupTurns = (messages: readonly (UIMessage | ModelMessage)[]): TTurn[] => {
  const turns: TTurn[] = []

  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue

    const content = stripEvidence(textOf(message))
    if (content === "") continue

    if (message.role === "user") {
      turns.push({ user: content, assistant: [] })
    } else {
      // An assistant message before any user turn has nothing to answer.
      turns.at(-1)?.assistant.push(content)
    }
  }

  return turns
}

export const windowMessages = (messages: readonly (UIMessage | ModelMessage)[]) => {
  const turns = groupTurns(messages)
  const last = turns.at(-1)

  if (!last || last.assistant.length > 0) {
    throw new ChatRequestError(
      API_ERROR_CODE.invalidRequest,
      "The last message must be a question.",
    )
  }

  if (last.user.length > MAX_QUESTION_CHARS) {
    throw new ChatRequestError(
      API_ERROR_CODE.invalidRequest,
      `The question is longer than ${String(MAX_QUESTION_CHARS)} characters.`,
    )
  }

  const history: ModelMessage<string>[] = []
  let total = last.user.length

  for (const turn of turns.slice(0, -1).reverse()) {
    const answer = turn.assistant.join("\n\n")
    total += turn.user.length + answer.length
    if (total > MAX_HISTORY_CHARS) break

    history.unshift(
      { role: "user", content: turn.user },
      ...(answer === "" ? [] : [{ role: "assistant" as const, content: answer }]),
    )
  }

  return { history, question: last.user }
}

const evidenceBlock = ({ marker, fileName, headingPath, startLine, endLine, text }: TEvidence) => {
  const heading = headingPath.length > 0 ? ` · "${headingPath.join(HEADING_SEPARATOR)}"` : ""
  return `Evidence [${marker}] (${fileName}${heading} · lines ${String(startLine)}–${String(endLine)}):\n${text}`
}

export const buildEvidenceMessage = (question: string, evidence: readonly TEvidence[]) =>
  [...evidence.map(evidenceBlock), `Question: ${question}`].join("\n\n")
