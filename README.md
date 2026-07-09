# CoCapital

Shared-capital management for two business partners: record movements in
seconds, always know how much capital the group has and where it sits, and
run interest-bearing loans with auto-generated schedules.

**App:** [`app/`](./app) — Next.js (App Router, RSC) · Clerk · Neon Postgres
· Drizzle · Tailwind + shadcn/ui. See [`app/README.md`](./app/README.md).

## How we build

See **[FLOW.md](./FLOW.md)** — a prototype-validated flow (two loops:
Validate → Build) with a Module/Epic/Usecase/Task hierarchy and a hats-based
roadmap.

- **Specs (AI source-of-truth):** [`specs/`](./specs) — Markdown.
- **Visual overview (human):** GitHub Project — Board / Roadmap / Table-by-Hat.

## Status

MVP shipped (E1 Onboarding · E2 Movements & Capital · E3 Lending ·
E4 Trust & Corrections). Currently in real-user validation.

## Layout

```
app/        the product (see app/README.md)
specs/
  product/    vision.md, decisions.md, validation.md
  epics/      one file per epic
  modules/    one file per module
  templates/  epic.md, usecase.md, task.md
docs/design/  synced snapshots of the Claude Design prototypes
FLOW.md   CLAUDE.md
```
