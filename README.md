# document-rag-chat

A personal workspace for exploring document search and AI chat with TanStack Start and AWS. The interface is called **Document Workbench**.

## Status

Documents can be uploaded, listed and indexed. Asking questions about them is not built yet.

**Implemented**

- TanStack Start + React 19 + TypeScript, server-rendered page shell with client hydration.
- A start page with a responsive two-panel layout marking where documents and chat will go. The panels are empty states; they do not upload, search or answer anything.
- TanStack Query wiring: a `QueryClient` factory (one instance per server request) and a typed query key factory, both unit-tested.
- Tailwind CSS 4 + shadcn/ui with semantic tokens, including dark-mode tokens.
- Localisation with Paraglide (`en`, `de`): the locale lives in the URL, is resolved on the server so SSR and hydration agree, and a working switcher sits in the page header.
- ESLint, Stylelint, Prettier, TypeScript and Vitest, wired into Git hooks and one CI workflow.
- Document upload and listing. `POST /api/files` takes `{ name, sizeBytes }`, records the document as `processing` and answers with a presigned S3 form; the browser posts the file into the bucket itself, so the bytes never pass through the server. The form is valid for 5 minutes and its policy pins the object key, the content type and the exact byte count. `GET /api/files` lists what exists. Markdown only, up to 5 MB per file and about 5 files — the count is checked before the form is issued and never reserved, so two simultaneous uploads at the limit can leave one file over it. The Knowledge Base page uploads one file after another, lists them and polls while anything is processing.

  Uploading and browsing are separate on screen: a dialog owns the files going up right now — each with its own byte progress, its own error and its own retry — and the table owns what already exists and how far its indexing has got. The table is paginated on the server.

  Two consequences of uploading straight into the bucket: the server cannot inspect the bytes, so a file that is not really Markdown is indexed as whatever text it contains rather than rejected; and an upload the user abandons after the form is issued leaves a row stuck in `processing` until the badge reports it as stale.

- Document ingestion. The S3 upload notification lands in an SQS queue and a Lambda processes the whole document in one attempt: chunk it, write `index/{fileId}/chunks.jsonl`, embed every chunk with Titan Text Embeddings v2 and write the vectors into an S3 Vectors index, then publish by moving the status to `ready` with a conditional write. Nothing is visible until that single write lands, so a half-processed document is never readable.

  Failures split in two. A transient one — throttling, a network error, a bug — is thrown, which returns the message to the queue and re-runs the document from scratch; after three attempts it reaches the dead-letter queue and a second Lambda marks the document `failed`. A deterministic one is not retried: a file with no indexable text is marked `failed` on the first attempt with the reason shown in the list.

  A document that is empty or contains only whitespace is the only content that fails deterministically. Anything else — an images-only file, an oversized code fence — is indexed, with the chunker limits listed below.

- `GET /api/health` and the two Lambda handlers for the ingestion queue. One AWS environment (`develop`), set up by hand outside the repository; a push to the `develop` branch deploys code into it through [GitHub Actions](./.github/workflows/deploy-develop.yml). Nothing run locally creates, changes or deploys anything in AWS.

**Not implemented**

- Chat, retrieval, streaming answers and the source viewer. The vectors are written but nothing queries them yet.
- Deleting documents or vectors, and reprocessing a document that failed — recovery is re-uploading the file.
- Evaluation fixtures, questions and results.

Nothing in the repository requires AWS credentials or a paid API to install, run or check.

## Requirements

- Node — the version in [`.nvmrc`](./.nvmrc) (22.20.0); the supported range is in `engines` (`>=22.12.0`).
- pnpm — the version pinned in `packageManager` (10.14.0). `corepack enable` picks it up automatically.

Installing, running and checking the repository needs no environment variables. Uploading a document does: `DOCUMENTS_BUCKET`, `AWS_REGION` and credentials for an account whose bucket carries the CORS rule from the setup procedure — see [`.env.example`](./.env.example).

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

```bash
pnpm build           # production build into .output/ — a streaming Lambda handler + static assets
pnpm build:lambda    # bundle the SQS Lambda entry points into dist/lambda/
pnpm preview         # rebuild for a plain Node server and serve it
```

### Checks

```bash
pnpm check        # format:check → lint → stylelint → typecheck → test
```

Individually: `pnpm format:check`, `pnpm lint`, `pnpm stylelint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. CI ([`.github/workflows/checks.yml`](./.github/workflows/checks.yml)) runs the same commands on the same Node and pnpm versions, plus commitlint over the commits of a pull request.

Git hooks (Husky) run ESLint, Stylelint and Prettier over staged files before a commit, and commitlint over the message. `HUSKY=0` disables them, which is what CI does.

## Structure

```
messages/          translation catalogues, one JSON per locale
project.inlang/    Paraglide project settings (locales, message format)
src/
  routes/          pages and Start HTTP API routes
  components/      application components (locale switcher)
  components/ui/   individual shadcn components
  lib/query/       QueryClient factory + query key factory
  lib/utils.ts     cn
  server/          server-side logic, laid out like a NestJS app:
    app.ts         composition root — constructs and wires the services
    shared/        one wrapper per AWS service: config, s3, sqs, bedrock, s3-vectors
    modules/       domain modules: documents, ingestion (with its chunker)
  lambda/          Lambda entry points (ingestion, DLQ) — thin, call a service
  router.tsx       router creation, locale URL rewrite, Start <-> Query integration
  server.ts        Start server entry, wrapped in the Paraglide request middleware
  styles.css       Tailwind entry point and design tokens
  paraglide/       compiled messages — generated, not committed
  routeTree.gen.ts generated — do not edit
```

Folders are created together with real content. Where each of them will go is listed in [AGENTS.md](./AGENTS.md). `@/*` resolves to `src/*`.

`src/lambda/` holds the Lambda entry points that `pnpm build:lambda` bundles; AWS itself is configured outside the repository.

`src/server/modules/ingestion/chunker/chunker.ts` splits a Markdown document into retrieval chunks of about 450 tokens. The splitting is `@langchain/textsplitters`; the module adds the two things that splitter does not return and citations need — the chunk's line range in the original, recovered by locating each chunk in the source, and the heading breadcrumb above it, taken from the remark syntax tree.

Its limits, all covered by tests in `chunker.test.ts`:

- **Tables and fenced code blocks are split** when they exceed the chunk size. A later piece of a table arrives without its header row, and a piece of a fence can be unclosed.
- **A chunk's breadcrumb describes its first line only.** A chunk that spans several sections is cited under the heading it starts in.
- **Images and raw HTML are indexed, not ignored**, so an HTML comment in a document reaches the model.

The original always stays in S3 and is read back by line range.

`eval/docs/` is the corpus everything is measured against: five Markdown documents and a manifest of planted facts, written by a seeded generator.

```bash
pnpm eval:docs
```

The documents themselves are **not committed** — they are 2.7 MB of generated Markdown, and the generator reproduces them byte for byte from a fixed seed. What is committed is the generator and `manifest.json`, which records every planted fact with its file and line range, so the expected answers are reviewable without running anything.

Run `pnpm eval:docs` once after cloning. Until you do, the chunker's corpus test reports itself as skipped rather than failing.

## No database: where document state lives

There is no database. A document's state is one small JSON object in the same bucket as the file, and `GET /api/files` builds the list by reading that prefix one page at a time.

The key is `status/{inverted uploadedAt}-{fileId}.json`. S3 returns keys in one order only — ascending lexicographic — and a listing carries no object contents, so sorting on a field inside the objects would mean reading every one of them before showing the first row. Subtracting the upload time from a fixed ceiling and zero-padding it puts the newest documents first in S3's own order, which makes `MaxKeys` + `ContinuationToken` a real page: one `ListObjectsV2` plus one `GetObject` per row shown, whatever the size of the library. The price is that the key can no longer be computed from a file id, so the upload form pins it into the original's metadata as `x-amz-meta-status-key` for the ingestion worker to read back.

The queue does not hold this state and cannot. SQS carries the instruction "this file needs processing": a message is deleted once the worker succeeds, cannot be looked up by file id, is invisible to everyone else while one consumer holds it, and expires after at most 14 days. The status object answers a different question — what a document is — and has to keep answering it long after the work is done.

What makes an object usable as state here is S3's conditional writes. Creating a status uses `If-None-Match: *`, so a second write for the same id loses instead of overwriting. Moving one to `ready` or `failed` uses `If-Match: <etag>`, so when the ingestion worker and the dead-letter handler both try to close the same file, exactly one wins and the other is told its copy was stale. That is the compare-and-swap a conditional `UpdateItem` would otherwise provide.

The costs are real, and they are what would push this to DynamoDB:

- Only one ordering is possible — the one baked into the key. Sorting the table by name or by size would mean reading the whole prefix again.
- Nothing can be queried. "Show me the failed documents" means reading all of them.
- No atomic counter, which is why the file-count limit is best effort rather than a reservation.
- No TTL, no secondary index, no transaction spanning two documents.

At the stated limits — 30 documents in the library, 5 per upload, 5 MB each, one shared environment without accounts — none of those bite, and the bucket that already stores the file stores its state without a second service, a second IAM surface or a second bill. The point at which this stops being true is a corpus large enough that listing becomes a page-load cost, or per-user libraries, or needing to select by status.

## Rendering

Standard TanStack Start SSR: the server renders the page shell and the browser hydrates it. There is no SPA mode and no React Server Components.

The locale is part of the URL (`/` for English, `/de/` for German). The router de-localizes the URL before matching routes and localizes it again on the way to history, so route files never spell out a locale segment. `src/server.ts` wraps the Start handler in Paraglide's middleware, which is what makes `getLocale()` return the right locale during server rendering.

Application data will be fetched with ordinary browser queries through TanStack Query. There is deliberately no prefetching in route loaders and no server-side data loading at this stage. The `QueryClient` is built by a factory inside router creation, so each server request gets its own cache and the browser keeps one instance for the lifetime of the router.

## Working in this repository

Add a shadcn component only when something uses it, one at a time:

```bash
pnpm dlx shadcn@latest add button
```

The registry currently emits `import { cn } from "cn"`; rewrite it to `@/lib/utils` — the `cn` package is intentionally not a dependency, so ESLint and `tsc` catch a forgotten rewrite.

### Translations

UI strings live in `messages/en.json` and `messages/de.json` and are read through `m.*`:

```tsx
import { m } from "@/paraglide/messages"

;<h1>{m.app_title()}</h1>
```

Add a key to **every** catalogue, then regenerate:

```bash
pnpm messages
```

`src/paraglide/` is compiled output — it is not committed and `pnpm install` regenerates it, so a fresh clone can run `pnpm typecheck` and `pnpm lint` straight away. `pnpm dev` and `pnpm build` recompile it as well. A new locale is added to `project.inlang/settings.json` plus its own `messages/<locale>.json`.

### Devtools

The TanStack devtools panel (Router + React Query) is mounted in `src/routes/__root.tsx` and shows up only while developing: `@tanstack/devtools-vite` strips it out of the production build.

### Commits

Commit messages follow Conventional Commits, checked by commitlint:

```
chore: configure project tooling
```

Conventions for agents — structure, the client/server boundary, the Query pattern — live in [AGENTS.md](./AGENTS.md); [CLAUDE.md](./CLAUDE.md) adds only what is specific to Claude Code.

## Reused from other repositories

Both sources are MIT-licensed, © Vadym Haidai.

- [react-shadcn-ts-template](https://github.com/vadimgaidai/react-shadcn-ts-template) @ `d2d4f4abf5a6c832cd81f48be3d48f5284bdbbc8` — code-quality setup (ESLint rule set, Prettier, Stylelint, EditorConfig, Husky + lint-staged + commitlint), the shadcn token approach, and `createQueryKeyFactory` (`src/shared/lib/react-query/query-key-factory.ts` → `src/lib/query/query-key-factory.ts`). The template is a React Router SPA on Feature-Sliced Design; its `package.json`, Vite SPA config, routing and FSD layout were **not** carried over, and the FSD paths and rules were removed from the ESLint config.
- [react-feature-kit](https://github.com/vadimgaidai/react-feature-kit) @ `5de0d6b91a5f227e7d8a8eca894babf7b7f86e08` — the `react-feature-workflow` Claude Code plugin, enabled at project scope in `.claude/settings.json`. The `feature-sliced-design` plugin is deliberately not enabled.

## Next

The deployment shape is the application and its API on Lambda, documents in S3, and ingestion as a separate Lambda behind SQS — one `develop` environment, deployed on push to `develop`. Cloning, installing and checking this repository creates no AWS resources.

The next stage is retrieval over the vectors ingestion writes, and the chat that reads it.
