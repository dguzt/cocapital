# Module: M5 — Capital

- **ID:** M5
- **WHERE:** The dashboard read-model. Answers "how much / where / is it growing."
- **Depends on:** M3 (movements) + M4 (loans/installments).
- **Nature:** **Read-only. Stores nothing.** Pure derivation over the ledger.

## Purpose
The headline the whole app exists to show. Reduces the movement ledger (and realized loan collections) into: total capital, where it sits, and recent activity.

## Derives (no owned tables)
| Indicator | Computed from |
|-----------|---------------|
| **Total capital** | contributions − expenses + realized profit (sales margin + **ganancia cobrada** from collected cuotas). |
| **Where it is** | **Efectivo** = cash bucket · **Inventario** = cost of items bought − sold · **Prestado** = outstanding loan principal (realized-only). |
| **Recent activity** | Last N movements, newest first (includes auto-written lend/repay). |

## Key rule (realized-only — D3 #5)
Expected interest is **never** in the total. Only collected interest counts. Keeps the headline honest.

## Boundaries
- **Zero writes.** If a number looks wrong, the bug is in M3/M4 data, not here.
- Recompute on read (or memoized) — no background jobs, no stored aggregates.

## Consumes
M3 (all movements), M4 (installment collection state for ganancia cobrada + Prestado).

> ⚠️ **Granularity note (blueprint):** kept standalone rather than folded into M3, because it also reads M4. Low risk; conscious choice.
