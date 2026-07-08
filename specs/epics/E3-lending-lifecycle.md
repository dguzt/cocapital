# Epic: Lending lifecycle

- **ID:** EPIC-003 (E3)
- **One-liner:** Create a loan with an auto-generated editable schedule, then collect cuotas — CoCapital's core value.
- **Priority:** P0
- **Hat:** Builder
- **Modules touched:** M4 Loans, M3 Movements, M5 Capital
- **Status:** Backlog
- **GitHub issue:** #—
- **Spec source:** decisions.md **D3** (locked) + D4 (calc confirmed).

## Why (problem / value)
The client's actual business is lending at interest. The generated repayment schedule (dates + per-cuota split) is the thing a notebook can't do — this is where CoCapital earns its keep.

## Outcome / definition of done
A partner creates a loan via the wizard (borrower select/create · monto · interés % · # cuotas · frecuencia · fecha) → sees an **editable schedule preview** with a running programado-vs-préstamo total → confirms. The loan writes a **`lend` movement** (principal → Prestado). Later, from loan detail, they **collect a cuota** (confirm-the-check) which writes a **`repay` movement**, flips the cuota to Cobrada, and moves interest into ganancia cobrada. Vencida shows as a derived red/amber warning.

## Flow (cross-module)
```
CREATE:  "+" → Préstamo → wizard (borrower + fields) → editable schedule → Confirmar
         → M4 Loan + Installments · Borrower · → M3 lend movement · → M5 Prestado ↑
COLLECT: Burger → Préstamos list → loan detail → Registrar cobro → confirm next cuota
         → M4 installment = cobrada · → M3 repay movement · → M5 cash ↑ + ganancia cobrada ↑ + Prestado ↓
DERIVE:  each render → Vencida = due_date < today && pendiente  (never stored)
```

## Children
| ID | Type | Description | Priority | Size | Module(s) |
|----|------|-------------|----------|------|-----------|
| UC-301 | Usecase | Borrower select-or-create (minimal entity) | P0 | S | M4 |
| UC-302 | Usecase | Loan wizard: fields → editable schedule preview → confirm | P0 | L | M4 |
| UC-303 | Usecase | Préstamos list (burger) + loan detail (summary + cuotas) | P0 | M | M4 |
| UC-304 | Usecase | Registrar cobro: confirm-the-cuota → repay movement | P0 | M | M4, M3 |
| UC-305 | Usecase | Vencida warning derived at render | P1 | S | M4 |
| UC-306 | Usecase | "Interés anual ~X%" reference figure (ROI info only) | P2 | S | M4 |
| TASK-301 | Task | Schedule calc engine (flat interest, equal split) + tests | P0 | M | M4 |

## Open questions
- ~~Calc method~~ → **CONFIRMED** flat interest, equal split (D4). Revisit only per real customer.
- Editing a cuota's date/amount lives in the **wizard only** for MVP (nothing committed). Editing an *active* loan's schedule = fast-follow (needs E4-style OK).
