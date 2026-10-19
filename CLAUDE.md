# CoCapital

Two purposes, one project:

1. **Product** — build and validate CoCapital (follow `FLOW.md`).
2. **Meta** — develop the skills and flow that fit the founder's style, so this project also serves as a workshop for the build methodology itself.

## Working agreement for the AI

- **GitHub account:** always run `gh auth switch --user dguzt` before any `gh`/git remote/push, and use the `github-dguzt` SSH alias for remotes. No other account is ever used in this repo.
- **Follow the two-loop flow** in `FLOW.md`. Small requests: just do them. Substantial features: run the flow (Explore → minimal Spec → prototype → gate → decompose → epic specs → develop per usecase/task).
- **Prototype before big specs.** In Loop A the goal is to validate the hypothesis with the smallest throwaway-OK build, not to write exhaustive specs.
- **Develop per usecase with the user's supervision** so they learn what's being built; develop non-functional tasks with tests.
- **Keep specs short and visual.** One-line descriptions, tables, diagrams. md is for the AI; the GitHub Project board is the human overview.

## Founder's working style

- **Founder is a software engineer who drives.** They guide the code, you propose. Never write code without their awareness — propose, show options, then implement what they pick.
- **Visual outputs preferred.** Use HTML pages, diagrams (Mermaid), beautified markdown, or CLI graphics — anything that makes the state of things clear at a glance.
- **You hold the context.** The founder shouldn't have to re-explain things. Capture decisions, rationale, and architecture as you go.
- **Keep control in their hands.** Every meaningful code change is supervised. Tests and non-functional work are exceptions — do those autonomously.
- **This meta-workflow is evolving.** The founder is shaping it as we go. Flag when the process itself could be improved.

## Hierarchy (see FLOW.md)

Module = WHERE (system part, multi-tag). Epic = WHAT (cross-cutting outcome, ≥ module). Epic → Usecases (functional) | Tasks (non-functional).

## Layout

```
specs/
  product/vision.md      Loop A: problem + solution hypothesis + users
  product/validation.md  Loop A: prototype scope + validation gate + results
  epics/                 one file per epic
  modules/               one file per module (its purpose + owned users)
  templates/             epic.md / usecase.md / task.md
```

## Backend architecture (non-negotiable)

Hexagonal, Java-style, and **screaming**: the business module comes first, the framework last.

```
src/backend/
  modules/<module>/
    domain/         entities (classes), value objects, types, pure rules. No I/O, no clock.
    ports/          interfaces the use cases need (repositories, identity provider, ChangeApplier).
    usecases/       ONE CLASS PER THING THE BUSINESS DOES — reads included. `execute(input)`.
    adapters/
      in/next/      server actions, session, requireMembership, *View DTOs for Client Components.
      out/drizzle/  *.table.ts, Drizzle<X>Repository implements the port, <X>Mapper row <-> entity.
      out/clerk/    what is asked of Clerk.
  shared/ports/     UnitOfWork.
  application/      container.ts (the whole graph) + apply-approved-change.ts (the dispatch).
  infra/db/         client (neon-serverless Pool), transaction context, DrizzleUnitOfWork,
                    schema/index.ts (re-exports every *.table.ts), migrations.
tests/              mirrors src. *.test.ts = unit · *.int.test.ts = Neon test branch ·
                    tests/architecture = boundaries · tests/e2e = Playwright.
```

### Classes, files, comments

- **No loose functions except helpers.** Entities are classes with a private constructor and named factories (`Group.create`, `Group.restore(snapshot)`); value objects only when they carry rules (`InviteCode`). One concept per file.
- **Use cases and repositories are classes**; the constructor is the dependency list. Input is a **named object**.
- **Entities never cross into Client Components**: adapters map them to plain `*View` types.
- **Mappers** (`GroupMapper.toDomain/toRow`) translate rows ↔ entities; `*Snapshot` is a domain type, never a Drizzle row.
- **Imports:** `@/` (src) or `@tests/` for anything outside the folder; `./` only for siblings. Biome rejects `../`.
- **Comments:** JSDoc only — a one-line summary, then `@param` / `@returns` / `@throws`, in English, in the business's language. No ids (UC/D/M/TASK), no history, no rules: rules become lint or architecture tests.
- **Breathing room:** one call per line in chains, blank lines around every `if` and between unrelated `const`s.

### Dependency injection: `typed-inject`

`application/container.ts` wires everything and **the compiler checks it**. No decorators.

> ⚠️ Container instances are singletons shared across requests. NEVER keep request state (`groupId`, `userId`, `actorId`) on `this` — it travels as an argument to `execute()`. `tests/architecture/container.test.ts` fails if a use case holds anything but collaborators.

### Transactions

The driver is `neon-serverless` (WebSocket), so transactions are real. A use case that writes more than once wraps the writes in `this.uow.run(async () => … return ok(…) )`: an `err` result or a throw rolls everything back, and a unit already running is joined. Repositories just run their queries; the `db` they hold follows the transaction in progress (AsyncLocalStorage).

### Rules that hold it together (enforced)

| Rule | Enforced by |
|---|---|
| domain/ports/usecases never import Next, Clerk, Drizzle or Neon | Biome override (`noRestrictedImports`) |
| domain depends only on domain | `tests/architecture/boundaries.test.ts` |
| ports/usecases never reach adapters, infra or the container | same |
| a module's use cases reach another module only through its **use cases** | same |
| `movements` (the ledger) never imports `loans`, `inventory` or `capital` | same |
| no dependency cycles in `src/backend` | same |

### The rule behind all of it

**A movement is how the ledger SHOWS a fact, not how the fact behaves.** Anular un cobro reopens a cuota (loans); anular una venta will restock (inventory); anular un aporte touches nothing else. So **every movement type names its owner**, and `application/apply-approved-change.ts` dispatches with an **exhaustive switch** — add a type and it stops compiling until you say who reverses it. Never grow an `if (type === …)` inside the ledger.

> Open: whether `movements` becomes a real double-entry **ledger** (Cuentas por Cobrar / por Pagar, accrual — selling ≠ getting paid). Decide before building inventory.

## GitHub Project field scheme

Type (Epic/Usecase/Task) · Priority (P0/P1/P2) · Size (S/M/L) · Hat (Builder/Tester/Manager/Hustler) · Module (multi-select) · Status.
