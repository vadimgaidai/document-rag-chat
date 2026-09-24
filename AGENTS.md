<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

# AGENTS.md

Project rules for `document-rag-chat` (UI name: **Document Workbench**). This file is the source of truth for conventions; other agent files link here instead of repeating them.

Stack, install steps and current status: [README](./README.md).

## Non-negotiables

- **pnpm only.** The version is pinned in `packageManager`; Node comes from `.nvmrc`. Never run `npm` or `yarn` in this repo.
- **`package.json` and `pnpm-lock.yaml` change through the package manager** (`pnpm add`, `pnpm remove`, `pnpm up`). Never hand-edit the lockfile.
- **Framework conventions outrank house style.** Route files, `Route`, `Register`, `routeTree.gen.ts` and other names the framework requires are never renamed to satisfy a lint or naming rule; add a scoped ESLint override instead.
- `src/routeTree.gen.ts` is generated. Do not edit it; run `pnpm generate-routes` if it drifts.
- Adding or updating a dependency is fine when the task needs it. Git commits, pushes, deploys and creating AWS resources are not part of agent work unless asked for explicitly.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` | Production build into `.output/` — a streaming Lambda handler plus static assets |
| `pnpm build:lambda` | Bundles `src/lambda/*` into `dist/lambda/<name>/index.js`, one zip-able Lambda each |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` / `pnpm lint:fix` | ESLint over the repo |
| `pnpm stylelint` / `pnpm stylelint:fix` | CSS |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm test` / `pnpm test:watch` | Vitest |
| `pnpm ingest:local <fileId>` | Runs ingestion against the real bucket, skipping the queue — needs AWS credentials |
| `pnpm eval` | The evaluation suite (`vitest.eval.config.ts`). Asks `EVAL_BASE_URL` 20 questions and writes `eval/results.md`; without that variable only the pure `eval/*.test.ts` run |
| `pnpm check` | format:check → lint → stylelint → typecheck → test |

`pnpm check` is the verification command. It never runs the evaluation: the root `vitest.config.ts` includes `src/**` only, so `pnpm test` touches no `eval/` file and makes no network call. `pnpm eval` costs Bedrock invocations and is run by hand against a deployed environment, after a corpus reset — the procedure is in the [README](./README.md#evaluation).

**Nothing run locally in this repository touches AWS, and no infrastructure lives in it.** No infrastructure-as-code tool, no `infra/` folder, no local deploy script. There is one environment, `develop`. Its AWS resources are created, changed and deleted by the user by hand with the AWS CLI, following the step-by-step procedure kept outside the repository in the gitignored `.planning/aws/SETUP.md`. Code reaches that environment only through `.github/workflows/deploy-develop.yml`, on every push to `develop`: `pnpm check`, build, `update-function-code` for the three functions, asset sync, CloudFront invalidation — with a GitHub OIDC role scoped to exactly those actions. When a step changes what the infrastructure must look like (a timeout, an env var, an IAM statement, a new resource), the change goes into `SETUP.md` as the exact command, and the user applies it; CI never reconfigures anything.

Git hooks already run ESLint, Stylelint and Prettier over staged files, and commitlint over the message — don't hand-format and don't re-run what a hook enforces.

## Structure

Folders are created together with real content. Do not pre-create empty modules, placeholder services, `index.ts` barrels or `.gitkeep` files.

| Path | Purpose |
| --- | --- |
| `src/routes/` | Pages and Start HTTP API routes |
| `src/features/app/` | The `_app` dashboard layout's own UI (sidebar, header, nav) — not reused by `_landing` |
| `src/features/landing/` | The `_landing` layout's own UI — not reused by `_app` |
| `src/features/chat/` | Chat UI and its local hooks |
| `src/features/documents/` | Document UI, queries and mutations |
| `src/components/` | UI actually shared across more than one feature/layout (e.g. a locale switcher, a theme toggle) |
| `src/components/ui/` | Individual shadcn components |
| `src/providers/` | Global app-level providers (theme, etc.) wrapped around the whole app in `__root.tsx` — not "components" |
| `src/lib/query/` | QueryClient factory and query key factory |
| `src/lib/api/` | Small HTTP client, once code actually calls an API |
| `src/lib/utils.ts` | `cn` |
| `src/server/` | Server-side application logic and AWS integrations, one folder per concern (see below) |
| `src/lambda/` | Lambda entry points (SQS ingestion, DLQ): thin adapters that parse the event and call `src/server/` — no logic of their own. Bundled one per file by `pnpm build:lambda` |
| `src/contracts.ts` | Shared API schemas, once real APIs exist |
| `scripts/` | Node scripts run by hand against a real environment (`pnpm ingest:local`). Never imported by the app |
| `eval/` | Fixtures, questions, eval and results |

### Inside `src/server/`

Laid out the way a NestJS application is, minus the framework. Three levels and nothing else at the root:

| Path | Role in Nest terms |
| --- | --- |
| `app.ts` | The `AppModule`: the one place that knows how a service is assembled. It exports factories (`createDocumentsService`, `createIngestionService`), not instances, so nothing runs at import time; a controller calls its factory once, at module level, and nothing else calls `new` on a service |
| `shared/` | `@Global()` modules — wrappers over one AWS service each, knowing nothing about documents: `config/`, `s3/`, `sqs/`, `bedrock/`, `s3-vectors/`, plus `utils/` for helpers with no domain |
| `modules/` | Domain modules: `documents/` (upload form, status objects and their transitions, the S3 key scheme, the line window a citation opens), `ingestion/` (the pipeline; its `chunker/` sub-folder holds the splitter, the `chunks.jsonl` format and their fixtures), `retrieval/` (corpus cache, BM25, fusion, rerank, evidence selection) and `chat/` (history window, prompt, the model call, marker resolution and the two `rag.*` events) |

Controllers live outside `src/server/` and stay thin: `src/routes/api/*` (HTTP) and `src/lambda/*` (Lambda) parse the input and call one service method.

Every module folder has the same file set, named after the module: `<name>.service.ts` — a class whose dependencies arrive through the constructor; `<name>.types.ts` — the types that cross a file boundary (a type used by one file stays in it); `<name>.constants.ts` — its numbers and strings; `<name>.helpers.ts` / `<name>.keys.ts` — pure functions with no dependencies, which need no class; tests next to what they test. There is no DI container: `app.ts` wires by hand, and a test builds a service with stubbed dependencies the same way.

Modules import each other by full path (`@/server/modules/documents/documents.keys`) — there are no barrels. `shared/` never imports from `modules/`.

Known cost of the single root: `app.ts` statically imports every service, so every Lambda bundle that imports it carries the chunker's dependencies (`@langchain/core`, `langsmith`, `remark` — ~900 KB) even when it only calls `createDocumentsService`. Measured and accepted; a root per entry point would remove it if it ever matters.

A feature under `src/features/` is anything that belongs to one particular layout or page and nothing else — a dashboard shell and a landing page count, same as a domain feature like chat or documents. `src/components/` holds only what's genuinely cross-cutting; when a component turns out to be used by just one feature, it moves into that feature instead of staying "global" by default. Inside a feature, files are grouped by kind: `components/`, `hooks/`, `api/` (queries, mutations, fetchers), `utils/` (pure helpers), plus `constants.ts`, `types.ts` and an `index.ts` that lists the feature's public surface — files inside the feature import each other by full path, never through that barrel. A folder exists only once it has a file. UI is imported from the component file directly (`@/components/ui/card`), never from a barrel. The `@/*` alias maps to `src/*`.

## Client / server boundary

- Standard Start SSR: the server renders the page shell, the browser hydrates. No SPA mode, no RSC.
- HTTP routes live in `src/routes/` (not `src/server/routes/`) and call application functions from `src/server/`. A Lambda handler in `src/lambda/` calls that server logic directly — never over the app's own HTTP API.
- Never touch `window`, `document` or `localStorage` at module import time or during server render.
- Secrets and the AWS SDK must not reach the client bundle. Everything under `src/server/` is imported only from `src/routes/api/*`, `src/lambda/*` and `scripts/` — never from a component, a hook or a loader. A function that must be callable from isomorphic code goes through Start's `createServerOnlyFn`. A `.server.ts` suffix has no effect in Start on its own (it appears only in the plugin's error hints), so it is not relied on.
- Client-readable env vars are prefixed `VITE_`; anything else stays server-side.
- `src/server.ts` is Start's server **entry** (one file). Application logic goes in `src/server/`.

## TanStack Query

`src/lib/query/client.ts` exports `createQueryClient()`. It is called once per server request and once per browser router lifetime, from `getRouter()` in `src/router.tsx`. There is no exported QueryClient instance — a shared one on the server leaks one visitor's cache into the next request. `setupRouterSsrQueryIntegration` owns the single provider and the dehydration; do not add a second provider or serialise the cache by hand.

Retries are configured on the QueryClient and nowhere else, so an HTTP client added later must not retry as well. Mutations never retry by default.

At this stage there is no prefetching in loaders and no server-side reads. Application data is fetched from the browser.

A feature's queries live in `queries.ts` and `mutations.ts` next to the feature, and combine the key with the fetcher through `queryOptions`:

```ts
// src/features/documents/queries.ts
import { queryOptions } from "@tanstack/react-query"

import { createQueryKeyFactory } from "@/lib/query/query-key-factory"

export const documentKeys = createQueryKeyFactory("documents", (all) => ({
  list: (status: string) => [...all(), "list", status] as const,
}))

export const documentQueries = {
  list: (status: string) =>
    queryOptions({
      queryKey: documentKeys.list(status),
      // Every parameter that changes the result is in the key, and the signal
      // is passed on so a cancelled query cancels its request.
      queryFn: ({ signal }) => fetchDocuments({ status, signal }),
    }),
}
```

Reusing one options factory in several components does not need a custom `useQuery` wrapper. `invalidateQueries({ queryKey: documentKeys.all() })` reaches every key the entity owns.

## Translations

Every user-visible string goes through Paraglide — no hardcoded copy in components.

```tsx
import { m } from "@/paraglide/messages"

;<h1>{m.app_title()}</h1>
```

- Keys live in `messages/<locale>.json`; a new key is added to **every** locale in the same change.
- Key names are snake_case and describe the place, not the text (`documents_empty`, not `no_documents_yet_message`).
- `src/paraglide/` is compiled output: generated, gitignored, and ignored by ESLint and Prettier. Never edit it — edit the catalogue and run `pnpm messages`.
- The locale is carried by the URL. `src/router.tsx` owns that through its `rewrite` pair (`deLocalizeUrl` / `localizeUrl`) and `src/server.ts` wraps the handler in `paraglideMiddleware`, which is what makes `getLocale()` work during SSR. Do not add a second de-localization step — the two would fight and loop.
- A new locale is added to `project.inlang/settings.json` **and** gets its own catalogue file.

## shadcn/ui

Install components one at a time, only when something uses them:

```bash
pnpm dlx shadcn@latest add button
```

Two things to do after each `add`:

1. The registry currently ships `import { cn } from "cn"`. Rewrite it to `@/lib/utils` — ESLint and `tsc` both fail otherwise, because the `cn` package is deliberately not a dependency.
2. Check `pnpm-lock.yaml` picked up whatever peer dependency the component pulled in.

Do not install the whole component set, and do not hand-roll a primitive shadcn already provides. Styling goes through the semantic tokens in `src/styles.css` and `cn`.

## Commits

Conventional Commits, enforced by commitlint: `type: subject`, e.g. `chore: configure project tooling`. Standard types (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`, …) all pass; scopes are optional.

## Out of scope right now

Don't add a backend framework, a monorepo, a database, auth, i18n or a global state manager.
