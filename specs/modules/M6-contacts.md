# Module: M6 — Contacts

- **ID:** M6
- **WHERE:** The people a group deals with.
- **Depends on:** M2 (a contact belongs to a group).
- **Spec source:** decisions.md **D6 #10**.

## Purpose
One list of people per group, so the same person can borrow (M4) and buy on credit (M7) and later show "Juan nos debe X en total".

## Owns (entities)
| Entity | Fields | Notes |
|--------|--------|-------|
| **Contact** | id, group_id, name, phone? | Select-or-create from a form (`ResolveContact`). Table `contacts` (was `borrowers`). |

## Consumed by
M4 (`loans.borrower_id`) · M7 (`credit_sales.buyer_id`).
