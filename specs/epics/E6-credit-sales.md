# Epic: Venta en cuotas

- **ID:** EPIC-006 (E6)
- **One-liner:** Sell goods paid back in cuotas, with the cost recovered and the margin earned as each cuota is collected.
- **Priority:** P0
- **Hat:** Builder
- **Modules touched:** M6 Contacts, M7 Inventory, M3 Movements, M5 Capital
- **Status:** In progress
- **GitHub issue:** #—
- **Spec source:** decisions.md **D6** (locked).

## Why (problem / value)
The partners sell on credit today and track it on paper. Without it, a credit sale either drops the capital total (cost leaves inventory, no cash enters) or overstates it.

## Outcome / definition of done
"Vender" opens `/ventas/nueva`. En cuotas works like Nuevo préstamo: buyer, item, price, optional cost, optional pago inicial, cuotas, frequency, start, editable schedule that must add up. The sale shows in `/ventas` and `/ventas/[id]`, cuotas are collected one by one, the plan can be changed, and the sale can be voided with the partner's OK. The panel shows "Cuentas por cobrar".

## Flow
```
SELL:     Vender → /ventas/nueva (En cuotas) → Confirmar
          → M6 contact (new or picked) · M3 sell_on_credit · M7 CreditSale + cuotas
          → [pago inicial] M3 collect_sale · cuota "Inicial" collected
          → M5 inventory −cost · receivable +cost
COLLECT:  /ventas/[id] → Cobrar (cuota) → M3 collect_sale (cost share in `cost`)
          → M5 cash +amount · receivable −share · Por ventas +margin
RE-PLAN:  Cambiar plan → uncollected cuotas rewritten (Σ = pending) → activity
VOID:     Anular venta → partner OK → sale + every cobro voided → capital as before
```

## Children
| ID | Type | Description | Priority | Size | Module(s) | PR |
|----|------|-------------|----------|------|-----------|----|
| TASK-601 | Task | `contacts` module replaces `borrowers` (+ bridge view) | P0 | M | M6, M4 | A |
| TASK-602 | Task | `CreditSale` domain: schedule, cost split, re-plan + unit tests | P0 | M | M7 | B |
| UC-601 | Usecase | "Vender" opens `/ventas/nueva` with Al contado \| En cuotas | P0 | S | M7 | B |
| UC-602 | Usecase | Crear venta en cuotas (schedule must add up) | P0 | L | M7, M6, M3 | B |
| UC-603 | Usecase | `/ventas` list + `/ventas/[id]` detail | P0 | M | M7 | B |
| UC-604 | Usecase | Cobrar una cuota (+ deshacer with OK) | P0 | M | M7, M3 | B |
| UC-605 | Usecase | Cambiar plan | P1 | M | M7 | B |
| UC-606 | Usecase | Anular venta (cascade, with OK) | P0 | M | M7, M3 | B |
| UC-607 | Usecase | Panel: Cuentas por cobrar + margen por cobrar; activity rows | P0 | S | M5, M3 | B |

## Prueba manual

**TASK-601 · contacts** (PR A, nothing visible changes)
1. Nuevo préstamo → "Elegir o crear prestatario" → the people you lent to before are listed.
2. Create a loan for a new name → it appears; create another for the same person picked from the list → still one entry.

**UC-601 · Vender abre su página**
1. Agregar movimiento → the grid still has 6 tiles; "Vender" says "abre página".
2. Tap it → `/ventas/nueva`, tab **Al contado** selected → register a sale of S/ 100 with cost 60 → Efectivo +100, Inventario −60, Por ventas +40.

**UC-602 · Crear venta en cuotas — el cronograma tiene que cuadrar**
1. Vender → En cuotas · price 100 · inicial 20 · 3 cuotas → cuotas 26.67 · 26.67 · 26.66 · footer "coincide ✓".
2. Change cuota 2 to 30 → amber "difiere +S/ 3.33" · Confirmar disabled.
3. Change cuota 3 to 23.33 → "coincide ✓" · Confirmar enabled.
4. Confirm with cost 60 → lands on the sale page · panel: Cuentas por cobrar S/ 48, margen por cobrar S/ 32, Efectivo +20.

**UC-603 · Lista y detalle**
1. `/ventas` → the sale shows buyer, item, "1/4 cobradas" and the pending amount.
2. With a cuota past its date → "⚠ 1 vencida" in the list and a red "Vencida" pill on the cuota.

**UC-604 · Cobrar**
1. Cobrar cuota 1 → toast "Cobro registrado" · the row shows "Cobrada" with its cost + margin split.
2. Collect cuota 3 before cuota 2 (adelantar) → allowed.
3. ↶ on a collected cuota → "falta el OK" · partner approves → cuota back to Pendiente, capital as before the cobro.

**UC-605 · Cambiar plan**
1. On a sale with cuota 1 collected: Cambiar plan → from 2 to 4 remaining cuotas → 53.33 split 13.33 · 13.33 · 13.33 · 13.34 · "coincide ✓".
2. Raise one cuota by 5 → "difiere +S/ 5" · Guardar disabled.
3. Fix it and save → activity shows "Plan cambiado 2 → 4" · capital unchanged.

**UC-606 · Anular venta**
1. Anular venta on a sale with 2 cobros → the dialog says it also voids 2 cobros and their total.
2. Partner approves → sale "Anulada", capital exactly as before the sale (product back in Inventario).

**UC-607 · Panel y actividad**
1. Panel shows "Cuentas por cobrar" next to Prestado, linking to `/ventas`; "margen por cobrar" below it, outside the total.
2. Actividad shows "Venta en cuotas", "Cobro de venta" and "Plan cambiado" rows.

## Open questions
- Product catalog with stock per unit (cost autocompletes) — future epic.
- Edit a created sale (price/cost) — future, like "editar préstamo".
