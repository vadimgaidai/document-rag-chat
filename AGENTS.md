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

| Command                                 | What it does                                       |
| --------------------------------------- | -------------------------------------------------- |
| `pnpm dev`                              | Dev server on port 3000                            |
| `pnpm build`                            | Production build (client + SSR)                    |
| `pnpm typecheck`                        | `tsc --noEmit`                                     |
| `pnpm lint` / `pnpm lint:fix`           | ESLint over the repo                               |
| `pnpm stylelint` / `pnpm stylelint:fix` | CSS                                                |
| `pnpm format` / `pnpm format:check`     | Prettier                                           |
| `pnpm test` / `pnpm test:watch`         | Vitest                                             |
| `pnpm check`                            | format:check → lint → stylelint → typecheck → test |

`pnpm check` is the verification command. Git hooks already run ESLint, Stylelint and Prettier over staged files, and commitlint over the message — don't hand-format and don't re-run what a hook enforces.

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
| `src/server/` | Server-side application logic and AWS integrations |
| `src/workers/` | Ingestion and DLQ entry points |
| `src/contracts.ts` | Shared API schemas, once real APIs exist |
| `infra/` | AWS deployment configuration |
| `eval/` | Fixtures, questions, eval and results |

A feature under `src/features/` is anything that belongs to one particular layout or page and nothing else — a dashboard shell and a landing page count, same as a domain feature like chat or documents. `src/components/` holds only what's genuinely cross-cutting; when a component turns out to be used by just one feature, it moves into that feature instead of staying "global" by default. Inside a small feature, files sit next to each other; subfolders appear only when the feature actually grows. Local hooks stay next to their feature. UI is imported from the component file directly (`@/components/ui/card`), never from a barrel. The `@/*` alias maps to `src/*`.

## Client / server boundary

- Standard Start SSR: the server renders the page shell, the browser hydrates. No SPA mode, no RSC.
- HTTP routes live in `src/routes/` (not `src/server/routes/`) and call application functions from `src/server/`. A worker calls that server logic directly — never over the app's own HTTP API.
- Never touch `window`, `document` or `localStorage` at module import time or during server render.
- Secrets and the AWS SDK must not reach the client bundle. Put server-only modules under `src/server/` **and** give them Start's import protection (`.server.ts` naming or `serverOnly()`); the folder name alone protects nothing.
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

Document ingestion, RAG, evaluation and AWS deployment are not implemented and are not part of setup-level changes. Don't add a backend framework, a monorepo, a database, auth, i18n or a global state manager.
