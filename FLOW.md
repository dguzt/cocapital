# CoCapital — Build Flow

The non-complex, prototype-validated flow we build with. Two loops.

```
LOOP A — VALIDATE  (once per product / per big bet)
  1. Explore ............. problem, users, existing pain
  2. Minimal Spec ........ 1 page: problem + solution hypothesis + who  (specs/product/vision.md)
  3. MVP Prototype ....... rough, throwaway-OK, just to test the hypothesis
  4. GATE: does it work / any traction signal?
        ├─ No  → back to Explore/Spec (pivot the hypothesis)
        └─ Yes → enter Loop B

LOOP B — BUILD  (repeats per MVP increment)
  1. Decompose ........... Modules  +  Users/Usecases
  2. Epic Specs .......... per epic, a short spec  (specs/epics/*.md)
  3. Develop:
        • per USECASE (functional) → with supervision (learn-as-you-go)
        • per TASK (non-functional: infra/system-design/tests) → with tests
  4. A few epics = shippable increment → ship
  5. Feedback → new modules / usecases / fixes → repeat Loop B
```

## Hierarchy — two orthogonal axes

```
MODULE  = WHERE   a part of the system (Orders, Inventory, Notifications, …)
EPIC    = WHAT    an outcome/flow that can cross modules
                  (e.g. "order-placed async event" → Orders fires it,
                        Inventory + Notifications react).  Epic ≥ Module.

Work breakdown tree:
PRODUCT
└─ EPIC  (cross-cutting outcome/flow)
   ├─ USECASE   functional, user-facing  → supervised dev
   └─ TASK      non-functional: infra, system-design, tests, perf

MODULE is a multi-select TAG on each usecase/task (an item can touch several),
NOT a parent of the epic.
```

Each work item carries: `id · one-line description · Priority (P0/P1/P2) · Size (S/M/L) · Hat · Status · Module(s) · parent Epic`.

## Hats (the roadmap is grouped by these)

| Hat | Profile | Example work |
|---|---|---|
| 🔨 Builder | hacker / dev | usecases, tasks, infra |
| 🧪 Tester | QA | test tasks, prototype validation |
| 🧭 Manager | PM | prioritize, decompose, gate decisions |
| 💸 Hustler | seller / GTM | talk to N users, landing page, pricing test, first sale |

Traction/money work (Hustler) are first-class issues competing for the same priority as code.

## Prioritization

YC "highest-order problem first" → score each item `Impact × Confidence ÷ Effort` → bucket P0/P1/P2. Only P0s enter the next increment.

## Where things live

- **AI source-of-truth:** Markdown in `specs/` (this repo). The AI reads these.
- **Human visual overview:** GitHub Project (Board / Roadmap / Table-by-Hat). You read this.
- Each GitHub issue links to its md spec; the two stay in sync.
