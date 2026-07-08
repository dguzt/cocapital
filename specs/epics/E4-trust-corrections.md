# Epic: Trust & corrections

- **ID:** EPIC-004 (E4)
- **One-liner:** A partner can edit or void a movement, but the change needs the other partner's OK before it takes effect — with an immutable history.
- **Priority:** P0 — **in the MVP** (D4; overrides D3 #9).
- **Hat:** Builder
- **Modules touched:** M3 Movements (+ M1 for the approver identity)
- **Status:** Backlog
- **Spec source:** decisions.md **D1** + D4.
- **GitHub issue:** #—

## Why (problem / value)
Two friends share one ledger. A mistyped S/500 erodes trust instantly. Corrections must be possible but never unilateral — the partner sees and approves every change. This is what makes a *shared* ledger safe on day one.

## Outcome / definition of done
Partner A edits/voids a movement → the change is recorded as **pending**, not applied. Partner B sees a pending-approval prompt → approves (change takes effect) or rejects (original stands). Every action lands in an **immutable EditLog** ("Ana cambió S/50 → S/45"). Nothing is ever physically deleted — "delete" = void, still visible.

## Flow (cross-module)
```
A edits movement → M3 writes pending change + EditLog(kind=edit, before/after)
                 → movement still shows OLD value
B opens pending  → Approve → change applied, capital (M5) re-derives
                 → Reject  → pending discarded, original stands
VOID: same path, kind=void → movement.status=voided (stays visible, excluded from M5)
```

## Children
| ID | Type | Description | Priority | Size | Module(s) |
|----|------|-------------|----------|------|-----------|
| UC-401 | Usecase | Propose an edit to a movement (goes pending) | P0 | M | M3 |
| UC-402 | Usecase | Propose a void (goes pending, never deletes) | P0 | S | M3 |
| UC-403 | Usecase | Partner approves / rejects a pending change | P0 | M | M3, M1 |
| UC-404 | Usecase | Immutable action history per movement | P1 | S | M3 |
| TASK-401 | Task | Pending-change state machine + EditLog + tests | P0 | M | M3 |

## Open questions
- ⚠️ **Creation approval?** D1 leaves open whether *creating* a movement also needs an OK. **Lean: no** — creation is append-only; only edits/voids need approval. Confirm before building UC-403.
- Notify the partner of a pending change: in-app badge for MVP; push/email is a fast-follow.
- 2-person quorum only (both must be the two members). N-partner quorum = E5.
