# Module: M2 — Groups

- **ID:** M2
- **WHERE:** The shared workspace. The container two partners share.
- **Depends on:** M1 (Accounts).
- **Constraint (D7):** 1–10 partners per group, several groups per user. No roles or member removal yet (E5).

## Purpose
The boundary that ties two people to one shared ledger, one loan book, one capital total. Everything financial hangs off a group.

## Owns (entities)
| Entity | Fields | Notes |
|--------|--------|-------|
| **Group** | id, name, invite_code, created_at | Up to 10 members (D7). |
| **Membership** | group_id, user_id, role, joined_at | `role` exists in schema but only `member` used in MVP; creator flagged for future admin (E5). |

## Behavior (D7)
- Anyone creates a group (even with groups already) → gets a shareable invite link/code.
- Anyone with the link joins, up to 10. Pages live under `/g/[groupId]`.
- Alone in a group, corrections apply at once; with 2+, any other member approves.
- No leave/kick, no rename-by-non-creator. Those stay in **E5**.

## Boundaries
- **Does NOT** compute capital or store movements — it scopes them (`group_id` foreign key everywhere).

## Consumed by
M3, M4, M5 — all scoped by `group_id`.

> ⚠️ **Future (E5):** creator-only management, roles, member removal. Schema leaves room (`role`) but no behavior built.
