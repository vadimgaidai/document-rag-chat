# CLAUDE.md

Project rules — structure, commands, the client/server boundary, the Query pattern, adding shadcn components, commit format — live in [AGENTS.md](./AGENTS.md). Read it first; nothing there is repeated here.

## Plugins

`.claude/settings.json` enables [`react-feature-workflow`](https://github.com/vadimgaidai/react-feature-kit) at project scope. It is declared, not installed: on a new machine run

```bash
claude plugin marketplace add vadimgaidai/react-feature-kit
claude plugin install react-feature-workflow@vadimgaidai --scope project
```

`feature-sliced-design` is deliberately **not** enabled — this project uses plain folders by purpose, and that plugin's hooks reject those paths.

Which command to run is documented by the plugin itself. Two notes specific to this repo:

- **No OpenAPI spec exists.** `/react-feature-workflow:analyze` skips its contract step; when a feature needs a `contract.md`, it is built from schemas written in this repository (`src/contracts.ts`), never from invented fields.
- **Direct instructions are fine** for setup work and small changes. A `.planning/<task>/PLAN.md` is for one substantial task, not for every edit.

Never author a skill, agent or hook in this repo, and never fork the plugin — change `react-feature-kit` instead. When this file and a loaded skill disagree, the skill wins.

## Verifying

`pnpm check` runs the static checks; `pnpm build` is separate. Don't commit, push or deploy unless asked.
