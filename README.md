# document-rag-chat

A personal workspace for exploring document search and AI chat with TanStack Start and AWS. The interface is called **Document Workbench**.

## Status

This repository currently contains the project skeleton and its tooling — nothing more.

**Implemented**

- TanStack Start + React 19 + TypeScript, server-rendered page shell with client hydration.
- A start page with a responsive two-panel layout marking where documents and chat will go. The panels are empty states; they do not upload, search or answer anything.
- TanStack Query wiring: a `QueryClient` factory (one instance per server request) and a typed query key factory, both unit-tested.
- Tailwind CSS 4 + shadcn/ui with semantic tokens, including dark-mode tokens.
- Localisation with Paraglide (`en`, `de`): the locale lives in the URL, is resolved on the server so SSR and hydration agree, and a working switcher sits in the page header.
- ESLint, Stylelint, Prettier, TypeScript and Vitest, wired into Git hooks and one CI workflow.

**Not implemented**

- Document upload, ingestion, chunking, embeddings and search.
- Chat, retrieval, streaming answers and the source viewer.
- AWS deployment, S3 storage, SQS-driven ingestion workers and any model call.
- Evaluation fixtures, questions and results.

Nothing in the repository requires AWS credentials or a paid API to install, run or check.

## Requirements

- Node — the version in [`.nvmrc`](./.nvmrc) (22.20.0); the supported range is in `engines` (`>=22.12.0`).
- pnpm — the version pinned in `packageManager` (10.14.0). `corepack enable` picks it up automatically.

No environment variables are needed. [`.env.example`](./.env.example) explains what will land there once the code actually reads something.

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

```bash
pnpm build        # production build (client + SSR)
pnpm preview      # serve the production build
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
  router.tsx       router creation, locale URL rewrite, Start <-> Query integration
  server.ts        Start server entry, wrapped in the Paraglide request middleware
  styles.css       Tailwind entry point and design tokens
  paraglide/       compiled messages — generated, not committed
  routeTree.gen.ts generated — do not edit
```

Folders are created together with real content, so `src/features/`, `src/server/`, `src/workers/`, `infra/` and `eval/` do not exist yet. Where each of them will go is listed in [AGENTS.md](./AGENTS.md). `@/*` resolves to `src/*`.

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

The next stage is AWS deployment and document ingestion — the application and its API on Lambda, documents in S3, and ingestion as a separate Lambda behind SQS. None of it exists yet, and no AWS resources are created by this repository.
