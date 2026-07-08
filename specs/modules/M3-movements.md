# Module: M3 — Movements

- **ID:** M3
- **WHERE:** The ledger. Every financial event, append-only.
- **Depends on:** M1 (author), M2 (scope).

## Purpose
The single source of truth for cash flow. Each movement is one dated, authored, typed event. The dashboard (M5) is derived entirely from this ledger. This is the riskiest-assumption surface: recording must take ~10 seconds.

## Owns (entities)
| Entity | Fields | Notes |
|--------|--------|-------|
| **Movement** | id, group_id, user_id, type, amount, concept, created_at, status | `status`: `active \| voided`. Never physically deleted. |
| **EditLog** | id, movement_id, actor_id, before, after, kind, created_at | Immutable history for D1. `kind`: edit \| void. |

## Movement types (fixed list — D-vision #3)
`contribute · buy_inventory · sell_inventory · lend · repay · expense`
> `lend` and `repay` are **auto-written by M4** (Loans), not hand-entered from the movement sheet. See M4.

## Boundaries
- **Corrections** (edit/void with double-confirmation) = **E4**, lives here as the EditLog + pending-approval flow.
- **Does NOT** compute totals — M5 reads movements and buckets them.
- **Loan-specific** movements are created *by* M4 but *stored* here (one ledger).

## Consumed by
M5 (capital read-model reduces over movements) · M4 (writes lend/repay movements).

> ⚠️ **D1 double-confirmation** (E4) governs edits/voids. Creation is append-only (no OK needed).
