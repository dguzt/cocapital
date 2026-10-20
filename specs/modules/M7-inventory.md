# Module: M7 — Inventory

- **ID:** M7
- **WHERE:** Buying and selling goods.
- **Depends on:** M3 (writes buy/sell movements), M6 (the buyer of a credit sale).
- **Spec source:** decisions.md **D6**.

## Purpose
Track goods bought and sold. Inventory value is derived from the ledger (no stock per product yet). Owns the **venta en cuotas**.

## Owns (entities)
| Entity | Fields | Notes |
|--------|--------|-------|
| **CreditSale** | id, group_id, user_id, buyer_id, item, price, cost?, frequency, status, sale_movement_id | Written once from `/ventas/nueva` (En cuotas). |
| **CreditSaleInstallment** | id, sale_id, number (0 = Inicial), due_date, amount, status, collect_movement_id | Collected one by one; Vencida derived. |

## Ledger
`buy_inventory` · `sell_inventory` (al contado) · `sell_on_credit` · `collect_sale`. Owners in `application/apply-approved-change.ts`.

## Consumed by
M5 (inventory bucket, receivable bucket, sales profit).
