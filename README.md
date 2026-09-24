# document-rag-chat

![TanStack Start](https://img.shields.io/badge/TanStack_Start-v1-EF4444?style=flat-square&logo=react&logoColor=white) ![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white) ![TypeScript 6](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Vite 8](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white) ![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) ![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-new--york-000000?style=flat-square&logo=shadcnui&logoColor=white) ![AWS Bedrock](https://img.shields.io/badge/AWS-Lambda_·_S3_·_Bedrock-FF9900?style=flat-square&logo=amazonaws&logoColor=white)

Upload Markdown documents and ask questions about them. Every answer cites the passages it rests on, and each citation opens the original at those lines. The interface is called **Document Workbench**.

Demo: <https://REDACTED.cloudfront.net> — one shared environment, no accounts.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Needs Node 22.12+ ([`.nvmrc`](./.nvmrc) pins 22.20.0) and the pnpm version in `packageManager`; `corepack enable` picks it up.

Installing and `pnpm check` need no AWS credentials and create nothing. Uploading a document or asking a question does — fill in `.env` first.

## Environment

Copy [`.env.example`](./.env.example) to `.env`. The buckets, the vector index and the model access are created by hand; nothing in this repository provisions them.

| Variable                          | What it is                                       |
| --------------------------------- | ------------------------------------------------ |
| `AWS_PROFILE`, `AWS_REGION`       | Credentials and region for the SDK               |
| `DOCUMENTS_BUCKET`                | Originals, `index/` chunks and `status/` objects |
| `VECTORS_BUCKET`, `VECTORS_INDEX` | S3 Vectors index holding the embeddings          |
| `EMBEDDINGS_MODEL_ID`             | `amazon.titan-embed-text-v2:0`                   |
| `RERANK_MODEL_ID`                 | `cohere.rerank-v3-5:0`                           |
| `GENERATION_MODEL_ID`             | `eu.amazon.nova-lite-v1:0` (inference profile)   |
| `EVAL_BASE_URL`                   | Deployed URL the evaluation runs against         |

## How it works

- **Upload** — `POST /api/files` records the document as `processing` and returns a presigned S3 form; the browser posts the bytes straight into the bucket. Markdown only, 5 MB per file.
- **Ingestion** — the S3 notification lands in SQS; a Lambda chunks the document, embeds every chunk with Titan and writes the vectors, then flips the status to `ready` with a conditional write. Failures retry three times, then the DLQ handler marks the document `failed`.
- **Retrieval** — the question is searched two ways over published documents only, S3 Vectors and BM25, merged by reciprocal rank fusion, rescored by Bedrock Rerank and cut to at most five passages above a score floor.
- **Generation** — the passages go to Nova Lite as numbered evidence; the model answers with `[cN]` markers, which the server resolves back to file, heading and line range. No passage above the floor means an abstention without calling the model.
- **State** — there is no database. A document's state is a JSON object under `status/` in the same bucket, ordered by an inverted timestamp in the key so listing is a real page.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` | Production build into `.output/` — streaming Lambda handler + static assets |
| `pnpm build:lambda` | Bundles `src/lambda/*` into `dist/lambda/<name>/index.js` |
| `pnpm check` | format:check → lint → stylelint → typecheck → test |
| `pnpm eval:docs` | Regenerates the test corpus from its seed |
| `pnpm eval` | The evaluation suite against `EVAL_BASE_URL` |
| `pnpm ingest:local <fileId>` | Runs ingestion against the real bucket, skipping the queue |

`pnpm preview`, `pnpm messages`, `pnpm generate-routes` and the individual `lint` / `stylelint` / `format` / `test` scripts exist too; Git hooks already run the formatters over staged files.

## Structure

```
messages/          translation catalogues, one JSON per locale
eval/              questions, metrics, SSE runner, corpus generator
src/
  routes/          pages and Start HTTP API routes
  features/        UI per layout or domain (app, landing, chat, documents, docs)
  components/      cross-cutting UI; components/ui/ is shadcn
  hooks/ providers/ lib/   shared client code (query client, key factory, cn)
  server/          app.ts composition root, shared/<aws-service>, modules/<domain>
  lambda/          ingestion and DLQ entry points — thin, call a service
  contracts.ts     shared API schemas
```

`@/*` resolves to `src/*`. Conventions live in [AGENTS.md](./AGENTS.md).

## Evaluation

`eval/` is an HTTP client of the deployed app, not of the local checkout. It asks 20 questions built from the corpus manifest and writes `eval/results.md`.

```bash
pnpm eval:docs    # once after cloning — the 2.7 MB corpus is generated, not committed
EVAL_BASE_URL=https://REDACTED.cloudfront.net pnpm eval
```

The environment must hold exactly one `ready` copy of each of the five documents; `beforeAll` fails the suite otherwise. Retrieval, citation and abstention outcomes are computed — answer correctness and claim support stay `pending_review` until a person fills them in.

The run is never part of `pnpm check`: it costs Bedrock invocations. Without `EVAL_BASE_URL` only the pure unit tests run.

## Deploy

One environment, `develop`. Its AWS resources are created by hand with the AWS CLI outside this repository; code reaches it through [GitHub Actions](./.github/workflows/deploy-develop.yml) on every push to `develop` — check, build, `update-function-code`, asset sync, CloudFront invalidation. CI never reconfigures infrastructure.

## Reused from other repositories

Both MIT, © Vadym Haidai: [react-shadcn-ts-template](https://github.com/vadimgaidai/react-shadcn-ts-template) (code-quality setup, shadcn tokens, `createQueryKeyFactory`) and [react-feature-kit](https://github.com/vadimgaidai/react-feature-kit) (the `react-feature-workflow` Claude Code plugin).
