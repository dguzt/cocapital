# Module: M4 — Loans

- **ID:** M4
- **WHERE:** The lending engine. First-class loans + generated schedules. CoCapital's core value.
- **Depends on:** M1, M2, M3 (writes lend/repay movements into the ledger).
- **Spec source:** decisions.md **D2 + D3** (locked).

## Purpose
Turn "I lent S/300 at 10% over 4 cuotas" into a computed, editable repayment schedule, then track collections against it. The installment math is the value — never typed by hand.

## Owns (entities)
| Entity | Fields | Notes |
|--------|--------|-------|
| **Loan** | id, group_id, user_id, borrower_id, capital, rate, n_cuotas, frequency, start_date, created_at | Created once via the wizard. |
| **Installment** | id, loan_id, number, due_date, amount, principal_share, interest_share, status | System-generated; `status`: `pendiente \| cobrada`. **Vencida is DERIVED** (`due_date < today && pendiente`), never stored (D3 #10). |
| **Borrower** | id, group_id, name, phone? | Minimal entity, select-or-create, reusable (D3 #8). No profile screen in MVP. |

## Calc method (LOCKED — D3 #2, confirmed D4)
`total = capital × (1 + rate)` · each `cuota = total / N` · `principal_share = capital/N` · `interest_share = interest/N`.
Frequency `{diario, semanal, quincenal, mensual}`; first cuota = `start + 1 period`. Installments free-editable, total floats (show programado-vs-préstamo).

## Capital treatment (realized-only — D3 #5)
Creating a loan writes a **`lend` movement** (cash → Prestado, principal only). Interest is "ganancia esperada" — enters capital **only** as cuotas are collected (each cobro writes a **`repay` movement**).

## Boundaries
- **Does NOT** own capital totals (M5) or the raw ledger rows (M3 stores the lend/repay movements it emits).
- Partial/prepay/mora/refinancing = **out of scope** (fast-follows).

## Consumed by
M5 (Prestado bucket + ganancia cobrada) · M3 (receives lend/repay movements).
