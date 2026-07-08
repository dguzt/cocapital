# Module: M2 — Groups

- **ID:** M2
- **WHERE:** The shared workspace. The container two partners share.
- **Depends on:** M1 (Accounts).
- **MVP constraint:** **fixed 2-person group** (D4). No N-partner logic, no roles, no invite UI yet.

## Purpose
The boundary that ties two people to one shared ledger, one loan book, one capital total. Everything financial hangs off a group.

## Owns (entities)
| Entity | Fields | Notes |
|--------|--------|-------|
| **Group** | id, name, invite_code, created_at | One per pair for MVP. |
| **Membership** | group_id, user_id, role, joined_at | `role` exists in schema but only `member` used in MVP; creator flagged for future admin (E5). |

## MVP behavior
- First user creates a group → gets a shareable invite link/code.
- Second user joins via the link → group is now full (2/2).
- No third-partner path, no leave/kick, no rename-by-non-creator. Those are **E5 (post-validation)**.

## Boundaries
- **Does NOT** compute capital or store movements — it scopes them (`group_id` foreign key everywhere).

## Consumed by
M3, M4, M5 — all scoped by `group_id`.

> ⚠️ **Future (E5):** N partners, creator-only management, roles/approvals quorum. Schema leaves room (`role`, `Membership`) but no behavior built.
