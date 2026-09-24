import type { TCitation, TDocument, TSourceRef } from "@/contracts"

import { ABSTENTION, STAGE } from "./metrics"
import { ASSUMED_QUERY_TOKENS, PRICES, RETRIEVAL_USD_PER_QUESTION } from "./pricing"
import { RUN_OUTCOME } from "./sse"

import type { TQuestionMetrics, TResolvedPassage } from "./metrics"
import type { TQuestion } from "./questions"
import type { TRunResult } from "./sse"

const PENDING = "pending_review"
const MANUAL_COLUMNS = ["answer correct?", "claims supported?", "confidence useful?"] as const

export type TEvalRow = {
  question: TQuestion
  run: TRunResult
  metrics: TQuestionMetrics
  expected: readonly TResolvedPassage[]
}

export type TReportInput = {
  startedAt: Date
  baseUrl: string
  commit: string
  rerankScoreFloor: string
  previousRerankScoreFloor: string | undefined
  corpus: readonly TDocument[]
  rows: readonly TEvalRow[]
}

const NUMBER = new Intl.NumberFormat("en-US")

const int = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : NUMBER.format(Math.round(value))

const usd = (value: number | "unknown", digits = 6) =>
  value === "unknown" ? "unknown" : `$${value.toFixed(digits)}`

const yesNo = (value: boolean | null) => (value === null ? "n/a" : value ? "yes" : "no")

const fraction = (part: number, total: number) => `${String(part)}/${String(total)}`

const ratio = (part: number, total: number) =>
  total === 0 ? "n/a" : `${(part / total).toFixed(2)} (${fraction(part, total)})`

const codes = (items: readonly string[], empty: string) =>
  items.length === 0 ? empty : items.map((item) => `\`${item}\``).join(", ")

const duration = (from: string | undefined, to: string | undefined) =>
  from && to ? `${int((Date.parse(to) - Date.parse(from)) / 1_000)} s` : "—"

const percentile = (values: readonly number[], share: number) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil(share * sorted.length) - 1)] ?? null
}

const table = (header: readonly string[], rows: readonly (readonly string[])[]) =>
  [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n")

const list = (items: readonly string[]) =>
  items.length === 0 ? "_none_" : items.map((item) => `- ${item}`).join("\n")

const refLine = (ref: TSourceRef) =>
  `\`${ref.marker}\` ${ref.fileName}:${String(ref.startLine)}–${String(ref.endLine)}` +
  (ref.headingPath.length > 0 ? ` — ${ref.headingPath.join(" › ")}` : "")

const citationLine = (citation: TCitation) =>
  `${refLine(citation)} · quote \`${citation.quoteStatus}\``

const passageLine = (passage: TResolvedPassage, corpus: readonly TDocument[]) => {
  const name = corpus.find((document) => document.fileId === passage.fileId)?.name ?? passage.fileId
  return `${name}:${String(passage.lines[0])}–${String(passage.lines[1])}`
}

const summaryTable = (rows: readonly TEvalRow[]) =>
  table(
    [
      "id",
      "category",
      "outcome",
      "hit@5",
      "coverage",
      "citation acc",
      "abstention",
      "confidence",
      "stage",
      "first byte",
      "total",
      "cost",
      ...MANUAL_COLUMNS,
    ],
    rows.map(({ question, run, metrics }) => [
      question.id,
      question.category,
      run.outcome,
      yesNo(metrics.hitAt5),
      fraction(metrics.coverage.found, metrics.coverage.total),
      fraction(metrics.citationAccuracy.correct, metrics.citationAccuracy.total),
      metrics.abstention,
      run.result?.confidence ?? "—",
      metrics.stage,
      `${int(run.firstByteMs)} ms`,
      `${int(run.totalMs)} ms`,
      usd(metrics.costUsd),
      ...MANUAL_COLUMNS.map(() => PENDING),
    ]),
  )

const aggregates = (rows: readonly TEvalRow[]) => {
  const retrieval = rows.filter(({ metrics }) => metrics.coverage.total > 0)
  const hits = retrieval.filter(({ metrics }) => metrics.hitAt5 === true).length
  const complete = retrieval.filter(
    ({ metrics }) => metrics.coverage.found === metrics.coverage.total,
  ).length
  const correct = rows.reduce((sum, { metrics }) => sum + metrics.citationAccuracy.correct, 0)
  const cited = rows.reduce((sum, { metrics }) => sum + metrics.citationAccuracy.total, 0)
  const missed = rows.filter(({ metrics }) => metrics.abstention === ABSTENTION.missedAbstain)
  const unnecessary = rows.filter(
    ({ metrics }) => metrics.abstention === ABSTENTION.unnecessaryAbstain,
  )
  const latencies = rows
    .filter(({ run }) => run.outcome === RUN_OUTCOME.ok)
    .map(({ run }) => run.totalMs)
  const priced = rows.flatMap(({ metrics }) =>
    metrics.costUsd === "unknown" ? [] : [metrics.costUsd],
  )
  const unpriced = rows.length - priced.length
  const notOk = rows.filter(({ run }) => run.outcome !== RUN_OUTCOME.ok)
  const pending = rows.filter(({ metrics }) => metrics.stage === STAGE.pendingReview)

  return table(
    ["metric", "value"],
    [
      ["questions", String(rows.length)],
      ["hit@5 (questions with an expected passage)", ratio(hits, retrieval.length)],
      ["fully covered", ratio(complete, retrieval.length)],
      ["citation accuracy (all citations)", ratio(correct, cited)],
      ["missed abstentions", String(missed.length)],
      ["unnecessary abstentions", String(unnecessary.length)],
      ["p50 latency", `${int(percentile(latencies, 0.5))} ms`],
      ["p95 latency", `${int(percentile(latencies, 0.95))} ms`],
      [
        "total cost (assumption-priced)",
        `${usd(
          priced.reduce((sum, value) => sum + value, 0),
          4,
        )}${unpriced > 0 ? ` + ${String(unpriced)} unknown` : ""}`,
      ],
      ["non-`ok` outcomes", String(notOk.length)],
      ["reached `pending_review`", String(pending.length)],
    ],
  )
}

const detail = ({ question, run, metrics, expected }: TEvalRow, corpus: readonly TDocument[]) => {
  const result = run.result
  const uncited = result?.claims.filter((claim) => !claim.cited).length ?? 0

  return [
    `### ${question.id} — ${question.category}`,
    "",
    `**Question.** ${question.question}`,
    "",
    `**Expected answer.** ${question.expectedAnswer ?? "_an abstention_"}`,
    "",
    "**Expected passages.**",
    list(expected.map((passage) => passageLine(passage, corpus))),
    "",
    `**Outcome.** \`${run.outcome}\`${run.error ? ` — ${run.error}` : ""} · first byte ${int(run.firstByteMs)} ms · total ${int(run.totalMs)} ms · ${usd(metrics.costUsd)}`,
    "",
    `**Metrics.** hit@5 ${yesNo(metrics.hitAt5)} · coverage ${fraction(metrics.coverage.found, metrics.coverage.total)} · citations ${fraction(metrics.citationAccuracy.correct, metrics.citationAccuracy.total)} · abstention ${metrics.abstention} · stage \`${metrics.stage}\``,
    "",
    "**Answer.**",
    "",
    "```text",
    run.text === "" ? "(no text)" : run.text,
    "```",
    "",
    "**Evidence.**",
    run.evidence === null
      ? "_no `rag.evidence` event (the no-evidence abstention emits none)_"
      : list(run.evidence.map(refLine)),
    "",
    "**Citations.**",
    list((result?.citations ?? []).map(citationLine)),
    "",
    `**Confidence.** ${result ? `\`${result.confidence}\`` : "—"} · ${String(uncited)} uncited claim(s) of ${String(result?.claims.length ?? 0)} · ${String(result?.quoteFailures ?? 0)} failed quote(s)${result?.flaggedMissingEvidence ? " · flagged missing evidence" : ""}`,
    "",
    `**Integrity.** ${codes(result?.integrity ?? [], "clean")}`,
    "",
    `**Unknown markers.** ${codes(result?.unknownMarkers ?? [], "none")}`,
    "",
    `**Usage.** ${run.usage === "unknown" ? "unknown" : `${int(run.usage.inputTokens)} in / ${int(run.usage.outputTokens)} out`}`,
    "",
    "**Raw `rag.result`.**",
    "",
    "```json",
    JSON.stringify(run.resultRaw ?? null, null, 2),
    "```",
  ].join("\n")
}

export const renderReport = ({
  startedAt,
  baseUrl,
  commit,
  rerankScoreFloor,
  previousRerankScoreFloor,
  corpus,
  rows,
}: TReportInput) => {
  const maxEvidence = Math.max(0, ...rows.map(({ run }) => run.evidence?.length ?? 0))

  return [
    "# Evaluation results",
    "",
    "Written by `pnpm eval` against a deployed environment, over the corpus in `eval/docs/` and the questions in `eval/questions.json`. Every number below is measured by the run except the prices in Notes, which are assumptions.",
    "",
    "The three right-hand columns of the summary are **not** computed. Semantic quality is never auto-judged here: a reviewer reads the per-question detail and replaces each `pending_review`.",
    "",
    "## Run",
    "",
    table(
      ["", ""],
      [
        ["date", startedAt.toISOString()],
        ["`EVAL_BASE_URL`", `\`${baseUrl}\``],
        ["commit", `\`${commit}\``],
        ["`RERANK_SCORE_FLOOR`", rerankScoreFloor],
        ["max evidence refs observed (k)", String(maxEvidence)],
        ["questions", String(rows.length)],
      ],
    ),
    "",
    "## Corpus",
    "",
    table(
      ["name", "fileId", "status", "chunks", "uploaded", "ready", "ingestion"],
      corpus.map((document) => [
        document.name,
        `\`${document.fileId}\``,
        document.status,
        int(document.chunkCount),
        document.uploadedAt,
        document.readyAt ?? "—",
        duration(document.uploadedAt, document.readyAt),
      ]),
    ),
    "",
    "## Summary",
    "",
    summaryTable(rows),
    "",
    "## Aggregates",
    "",
    aggregates(rows),
    "",
    "## Per question",
    "",
    rows.map((row) => detail(row, corpus)).join("\n\n"),
    "",
    "## Notes",
    "",
    list([
      `**Prices are assumptions**, read from ${PRICES.source} on ${PRICES.asOf} for ${PRICES.region}: Nova Lite $${PRICES.novaLite.inputPer1M.toFixed(2)}/1M input and $${PRICES.novaLite.outputPer1M.toFixed(2)}/1M output, Titan Text Embeddings V2 $${PRICES.titanV2.inputPer1M.toFixed(2)}/1M, Cohere Rerank 3.5 $${PRICES.rerank35.perThousandQueries.toFixed(2)}/1,000 queries.`,
      `Retrieval cost is a flat ${usd(RETRIEVAL_USD_PER_QUESTION)} per question — one rerank query plus an assumed ${String(ASSUMED_QUERY_TOKENS)}-token query embedding. It is added to every question, including one that ends in the no-evidence abstention, because retrieval ran either way.`,
      "A zero generation cost appears only where `rag.result.generated` was `false` — the model was never called. An abstention decided after generation keeps its real usage.",
      "`unknown` cost means run-finished carried no usage, not that the run was free.",
      "This eval does not distinguish a search miss from a rerank drop: a `retrieval_failure` row says the passage was not in the evidence, not which stage lost it.",
      "`confidence` is computed from citation coverage and quote checks only — it says nothing about whether the cited text is true. Judging that is the `answer correct?` column.",
      "A citation's `quote` status is `verified` only when a quotation in the sentence that cited it is found verbatim in that passage; `none` means the sentence quoted nothing.",
      ...(previousRerankScoreFloor === undefined
        ? []
        : [
            `\`RERANK_SCORE_FLOOR\` was changed from ${previousRerankScoreFloor} to ${rerankScoreFloor} and the eval was rerun. The floor was tuned against these same questions, so the retrieval numbers above are **in-sample** and would be optimistic on unseen questions.`,
          ]),
    ]),
    "",
  ].join("\n")
}
