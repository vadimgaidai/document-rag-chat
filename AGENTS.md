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

Conventions for `document-rag-chat`. Stack, scripts, env variables and how to run the app and the evaluation: [README](./README.md).

## Non-negotiables

- **pnpm only**, version pinned in `packageManager`. `package.json` and the lockfile change through `pnpm add` / `remove` / `up` — never by hand.
- **`pnpm check` is the verification command.** Git hooks already run ESLint, Stylelint, Prettier and commitlint; don't hand-format or re-run what a hook enforces. `pnpm eval` costs Bedrock invocations and is never part of a check.
- **Commits, pushes, deploys and AWS resources are not agent work** unless asked for explicitly. Adding a dependency the task needs is fine.
- **Generated, never edited:** `src/routeTree.gen.ts` (`pnpm generate-routes`) and `src/paraglide/` (`pnpm messages`).
- **Framework conventions outrank house style.** Names TanStack Start requires — `Route`, `Register`, route files — are never renamed to satisfy a lint rule; add a scoped ESLint override instead.
- **No infrastructure in this repository.** No IaC, no `infra/`, no deploy script. AWS is set up by hand outside the repo; when a change alters what the infrastructure must look like, it goes into that procedure as a command for the user to apply.

## Structure

Folders are created together with real content — no empty modules, placeholder services or `.gitkeep`. `@/*` is `src/*`.

| Path | Purpose |
| --- | --- |
| `src/routes/` | Pages and Start HTTP API routes |
| `src/features/<name>/` | UI belonging to one layout or domain: `app`, `landing`, `chat`, `documents`, `docs` |
| `src/components/` | UI shared by more than one feature; `components/ui/` is shadcn |
| `src/providers/`, `src/hooks/`, `src/lib/` | App-level providers, shared hooks, query client + key factory, `cn` |
| `src/server/` | Server logic and AWS integrations |
| `src/lambda/` | SQS ingestion and DLQ entry points — parse the event, call a service, no logic |
| `src/contracts.ts` | Shared API schemas |
| `scripts/`, `eval/` | Run by hand against a real environment; never imported by the app |

Inside a feature, files are grouped by kind (`components/`, `hooks/`, `api/`, `utils/`, `constants.ts`, `types.ts`) with an `index.ts` listing its public surface — files inside the feature import each other by full path, never through that barrel. A component used by only one feature lives in it, not in `src/components/`.

### Inside `src/server/`

A NestJS layout minus the framework, three things at the root:

- `app.ts` — the composition root. Exports factories, not instances, so nothing runs at import time; a controller calls its factory once at module level.
- `shared/` — one wrapper per AWS service (`config`, `s3`, `sqs`, `bedrock`, `s3-vectors`) plus `utils/`. Never imports from `modules/`.
- `modules/` — `documents`, `ingestion` (with its `chunker/`), `retrieval`, `chat`.

Each module has the same file set, named after it: `<name>.service.ts` (a class taking its dependencies through the constructor), `<name>.types.ts`, `<name>.constants.ts`, `<name>.helpers.ts` / `<name>.keys.ts` for pure functions, tests next to what they test. No barrels, no DI container — `app.ts` wires by hand and a test builds a service the same way with stubs.

## Client / server boundary

- Standard Start SSR — no SPA mode, no RSC. HTTP routes live in `src/routes/`, not `src/server/routes/`.
- **Nothing under `src/server/` is imported from a component, hook or loader** — only from `src/routes/api/*`, `src/lambda/*` and `scripts/`. Isomorphic code goes through `createServerOnlyFn`; a `.server.ts` suffix does nothing on its own.
- Client-readable env vars are prefixed `VITE_`. Never touch `window`, `document` or `localStorage` at import time or during server render.
- `src/server.ts` is Start's server entry (one file); application logic goes in `src/server/`.

## TanStack Query

`createQueryClient()` is called from `getRouter()` — one per server request, one per browser router lifetime. There is no exported instance: a shared one leaks a visitor's cache into the next request. `setupRouterSsrQueryIntegration` owns the provider and the dehydration; don't add a second or serialise by hand.

A feature's `queries.ts` / `mutations.ts` combine a `createQueryKeyFactory` key with the fetcher through `queryOptions`; every parameter that changes the result is in the key, and `signal` is passed on. Retries are configured on the QueryClient and nowhere else.

## Translations

Every user-visible string goes through Paraglide — `m.app_title()`, no hardcoded copy.

- Keys are snake_case and describe the place, not the text, and a new key is added to **every** `messages/<locale>.json` in the same change.
- The locale is carried by the URL: `src/router.tsx` owns the `rewrite` pair and `src/server.ts` wraps the handler in `paraglideMiddleware`. Don't add a second de-localization step.
- A new locale is added to `project.inlang/settings.json` **and** gets its own catalogue.

## shadcn/ui

Add one component at a time, only when something uses it: `pnpm dlx shadcn@latest add button`. The registry emits `import { cn } from "cn"` — rewrite it to `@/lib/utils`. Don't hand-roll a primitive shadcn already provides; style through the semantic tokens in `src/styles.css` and `cn`.

## Commits

Conventional Commits, enforced by commitlint: `type: subject`. Scopes optional.

## Out of scope

No backend framework, monorepo, database, auth or global state manager.
