# CoCapital — app

Next.js 16 (App Router, Server Components) · Clerk auth · Neon Postgres ·
Drizzle ORM · Tailwind v4 + shadcn/ui · Biome · Vitest.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values (see .env.example)
npm run dev                  # http://localhost:3000
```

Env vars are documented in [`.env.example`](./.env.example). Local dev runs
against a Neon **dev** branch; integration tests use an isolated **test**
branch (`DATABASE_URL_TEST`); production uses **main**. Same code — only the
connection string changes per environment.

## Scripts

| Script | What |
|---|---|
| `npm run dev` | dev server |
| `npm run check` | biome + tsc + unit tests (run before committing) |
| `npm run test` / `test:int` | unit / integration (real test DB) suites |
| `npm run check:full` | check + integration |
| `npm run db:generate` / `db:migrate` | drizzle migrations |
| `npm run db:studio` | browse the DB |

## Architecture

Modular monolith under `src/backend/modules/{accounts,groups,movements,loans,capital}`:
each module has pure `domain/` logic (unit-tested), a `data.ts` layer
(drizzle, integration-tested), and `actions.ts` (server actions — the
module's public API). `capital` owns no tables: it is a pure reducer over
the movements ledger and loan installments.

Money is **integer cents** everywhere (no floats, ever). The DB driver is
`neon-http` (edge-ready): it has no interactive transactions — every
multi-statement write is an atomic `db.batch()` with client-generated ids,
and conditional `UPDATE … WHERE` guards handle the read-decide-write cases.

UI: server components fetch, `loading.tsx` skeletons stream in; client
components exist only where there's interactivity, and every mutation
renders a pending state (disabled button + spinner) — loading states are
correctness, not polish.
