# AGENTS.md

ChartDB is an open-source **database diagramming editor**. Before exploring, read this — it encodes conclusions that took multiple deep analyses to derive and will save you from dead ends.

## Commands

- Node 24 (see `.nvmrc`). `npm ci` to install.
- `npm run dev` — Vite dev server.
- `npm run build` — **runs `lint` → `tsc -b` → `vite build`**. It is the superset of verification; CI calls `lint`, `build`, then `test:ci`.
- `npm run lint` / `npm run lint:fix` — ESLint with `--max-warnings 0` (zero warnings allowed).
- `npm test` — Vitest watch. `npm run test:ci` — single verbose run, `--bail=1`.
- Run one test file: `npx vitest run src/lib/data/sql-export/__tests__/export-sql.test.ts`. Filter by name: `npx vitest run -t "should parse"`.
- `pre-commit` hook runs `npm run lint` — run `npm run lint:fix` before committing or the hook blocks you.

## Architecture: there is NO backend

This is a **pure client-side React/Vite SPA**. Do not waste time looking for `server/`, `api/`, `express`, or a database server.

- Production = `nginx:alpine` serving static `dist/` (`Dockerfile`, `default.conf.template`). The only "dynamic" endpoint is nginx synthesizing `/config.js` → `window.env` (see "Env" below).
- **All persistence is in the browser** via IndexedDB through Dexie: `src/context/storage-context/storage-provider.tsx`. Tables: `diagrams`, `db_tables`, `db_relationships`, `db_dependencies`, `areas`, `db_custom_types`, `notes`, `diagram_filters`, `config`.
- The only external network calls are: (1) AI SQL export → OpenAI-compatible endpoint, direct from the browser; (2) Fathom analytics script in `index.html`.
- The "Smart Query" import flow means the user runs a SQL query **in their own DB**, copies the JSON, and pastes it here. ChartDB never connects to the user's database.

### Storage seam

`StorageContext` (`src/context/storage-context/`) defines ~50 CRUD operations. `ChartDBProvider` (`src/context/chartdb-context/chartdb-provider.tsx`) holds React state and mirrors every mutation to Dexie via `useStorage`. To add any sync/remote layer, implement a second provider against this same interface — do not scatter `fetch` calls through the UI.

**Dexie schema migrations are code, not SQL.** `storage-provider.tsx` declares 13 versions (`dexieDB.version(N).stores({...})`); changing a stored entity shape requires bumping the version and optionally adding an `.upgrade((tx) => ...)` callback to migrate existing rows. Forgetting this silently corrupts user data on upgrade.

### State & providers

State management is **15 nested React Context providers** (no Redux/Zustand). The editor nests them in a fixed order at `src/pages/editor-page/editor-page.tsx:114-150` (`StorageProvider` → `ConfigProvider` → `ChartDBProvider` → `HistoryProvider` → `ReactFlowProvider` → `CanvasProvider` → ...). Mutations flow through `useEventEmitter` (ahooks) events. Canvas is React Flow (`@xyflow/react`).

## AI: only cross-dialect SQL export exists

The **only** AI feature is translating a diagram's SQL from one dialect to another. There is **no AI chat, no AI assistant, no AI table generator** anywhere in the repo (verified exhaustively). Do not go looking for one.

- Entry point: `exportSQL` in `src/lib/data/sql-export/export-sql-script.ts:743`. Falls back to deterministic `exportBaseSQL` when source == target dialect.
- The `ai` + `@ai-sdk/openai` packages are **dynamically imported** (`export-sql-script.ts:771-773`) only when AI export is triggered — kept out of the initial bundle. Don't convert these to static imports.
- A **deterministic cross-dialect path** exists for PostgreSQL → MySQL/MariaDB/SQL Server in `src/lib/data/sql-export/cross-dialect/`. The export dialog (`src/dialogs/export-sql-dialog/export-sql-dialog.tsx`) shows a Deterministic/AI toggle only when both paths are available; otherwise AI is used automatically.
- Results cached in `localStorage` under `sql-export-<sha256>` (`export-sql-cache.ts`).

## No enterprise / FOSS feature gating in code

There are **no feature flags, no license checks, no `is_pro`/`is_enterprise`/paid-tier logic**. Everything available in the repo is available to all users.

- `HIDE_CHARTDB_CLOUD` (`src/lib/env.ts:9`) **only** suppresses the "Star us on GitHub" popup on the hosted `app.chartdb.io` — it gates nothing else.
- `IS_CHARTDB_IO` exists but is unused in any feature path.
- Any "enterprise" features (AI chat, collaboration, sharing, accounts) you may have heard about are **not in this repo** — they live in a separate proprietary codebase. Treat them as greenfield if asked to build them.

## No sharing / collaboration / sync exists

There is no URL sharing, no real-time collab, no Git sync, no accounts, no auth, no teams. The only way to move a diagram between browsers/users is manual JSON file export (`src/lib/export-import-utils.ts`) and re-import. If asked to add collaboration, expect to build the backend, auth, and sync layer from scratch.

## Env: build-time vs runtime

Two env layers — know which one you're changing:

- **Build-time** (`VITE_*` in `.env`, read via `import.meta.env` in `src/lib/env.ts`): `VITE_OPENAI_API_KEY`, `VITE_OPENAI_API_ENDPOINT`, `VITE_LLM_MODEL_NAME`, `VITE_HIDE_CHARTDB_CLOUD`, `VITE_DISABLE_ANALYTICS`. Baked into the bundle.
- **Runtime** (Docker): `entrypoint.sh` runs `envsubst` on `default.conf.template`; nginx serves `/config.js` which sets `window.env`. `src/lib/env.ts` and `export-sql-script.ts` read `window?.env?.X ?? VITE_X` so Docker deploys can swap the OpenAI key/endpoint/model **without rebuilding**. Preserve this fallback when editing env consumers.

AI export accepts **either** an OpenAI key **or** a custom `endpoint + model` pair (e.g. vLLM/Ollama) — don't require both. Default model: `gpt-4o-mini-2024-07-18`.

## Code style & conventions

- TypeScript strict, `noUnusedLocals` + `noUnusedParameters`. Path alias `@/*` → `./src/*` (configured in `tsconfig.app.json` and both vite/vitest configs).
- Prettier: **4-space indent**, single quotes, semis, es5 trailing commas (`.prettierrc.json`).
- ESLint enforces `@typescript-eslint/consistent-type-imports` → use `import type { ... }` for types.
- `react-refresh/only-export-components` is a warning — non-component exports from a file are allowed only if constant.
- Domain types + Zod schemas live together in `src/lib/domain/` (e.g. `diagram.ts` defines both `Diagram` and `diagramSchema`). Reuse the Zod schema for any new JSON import/validation path.
- `diagramToJSONOutput` (`src/lib/export-import-utils.ts:25`) serializes with **stable running IDs** so output diffs cleanly (useful for Git/snapshots). `diagramFromJSONInput` validates with Zod and re-clones with fresh IDs.
- i18n: user-facing strings live in `src/i18n/locales/*.ts` (20+ locales). `en.ts` is the source of truth — adding a string means adding the key everywhere, or builds/lints stay green but translations are incomplete.
- Templates: 49 bundled sample diagrams in `src/templates-data/templates/`, statically imported — not user-shareable.

## Testing

- Vitest with `happy-dom`, globals enabled, setup at `src/test/setup.ts` (`@testing-library/jest-dom` matchers + per-test cleanup).
- Tests are colocated in `__tests__/` directories as `*.test.ts` (107 files, concentrated under `src/lib/data/sql-import/` and `sql-export/`). No component tests for the React UI — tests are for the SQL/DBML/data-layer logic.
- `vite.config.ts` marks anything matching `/__test__/` as rollup `external` so test-only files never ship in the bundle.
- `.env` is gitignored and may contain a live OpenAI key — never print its contents or commit it.
