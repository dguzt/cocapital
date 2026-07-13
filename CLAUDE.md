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

The folders name the business, not the framework. Per module:

```
modules/<module>/
  domain/         pure FUNCTIONS and types. No I/O, no Drizzle, no clock. Unit-tested.
  usecases/       ONE CLASS PER THING THE BUSINESS DOES — reads included.
  repositories/   one class per table. The only place Drizzle lives.
  actions.ts      "use server": session → use case → revalidate. Zero logic.
application/      container.ts (the whole dependency graph) + the dispatch.
infra/db/schema/  one file per table. Table variables are PascalCase (Movements).
tests/            mirrors this tree exactly. *.test.ts = unit · *.int.test.ts = DB.
```

### Classes vs functions

- **Use cases and repositories are classes.** The constructor is the list of dependencies — that is the whole point, it's what you read first. Public `execute(input)`; helpers are `private`. Input is a **named object**, never a pile of positional params.
- **The domain stays pure functions** with descriptive names (`generateSchedule`, `checkSchedule`). They have no collaborators to inject, so a class would add ceremony and no information. `execute()` is reserved for use cases.
- **A read is a use case too.** `GetLoanDetail` authorizes the group and derives the expected interest — decisions, not a query. There is no `queries/` folder.

### Dependency injection: `typed-inject`

`application/container.ts` wires everything, and **the compiler checks it**: add a dependency to a use case and the container stops compiling. No decorators (Next 16 discourages legacy decorators and does not support `emitDecoratorMetadata`, so tsyringe/Inversify would degrade to unchecked string tokens).

> ⚠️ **The container's instances are module-level singletons, shared across requests.** NEVER put request state (`groupId`, `userId`, `actorId`) in a constructor or on `this` — it would leak between users. Request state always travels as an argument to `execute()`.

### Rules that hold the whole thing together

- **Imports:** `usecases → domain + own repositories` (and other modules' *use cases*, never their repositories). `movements` (the ledger) **must never import `loans` or `inventory`** — that direction is how the ledger starts learning everyone's rules. `DecideChange` depends on the `ChangeApplier` **interface**; the container injects the real one.
- **Atomicity:** neon-http has no interactive tx. Repositories return **unexecuted Drizzle statements**; the use case that owns the rule collects them and hands them to the injected `UnitOfWork`. That's how one use case writes across tables without a repository reaching into another module.

### The rule behind all of it

**A movement is how the ledger SHOWS a fact, not how the fact behaves.** Anular un cobro reopens a cuota (loans); anular una venta will restock (inventory); anular un aporte touches nothing else. So **every movement type names its owner**, and `application/apply-approved-change.ts` dispatches with an **exhaustive switch** — add a type and it stops compiling until you say who reverses it. Never grow an `if (type === …)` inside the ledger; that is the bug this architecture exists to prevent.

> Open: whether `movements` becomes a real double-entry **ledger** (Cuentas por Cobrar / por Pagar, accrual — selling ≠ getting paid). Decide before building inventory.

## GitHub Project field scheme

Type (Epic/Usecase/Task) · Priority (P0/P1/P2) · Size (S/M/L) · Hat (Builder/Tester/Manager/Hustler) · Module (multi-select) · Status.
