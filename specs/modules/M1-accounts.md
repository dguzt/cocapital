# Module: M1 — Accounts

- **ID:** M1
- **WHERE:** Identity & authentication. The person behind every action.
- **Depends on:** — (root)
- **Owned by:** Clerk (auth provider) + a thin `users` mirror in our DB.

## Purpose
Who is acting. Register, log in, and be identifiable as the author of every movement and loan. One account = one person.

## Owns (entities)
| Entity | Fields | Notes |
|--------|--------|-------|
| **User** | id, name, email, clerk_id, created_at | Mirror of the Clerk identity; `clerk_id` is the link. |

## Boundaries
- **Does NOT** own the group, movements, or capital — only identity.
- Authorship (`user_id` on movements/loans) is *referenced* from here, defined elsewhere.

## Consumed by
M2 (a user creates/belongs to a group) · M3 (movement author) · M4 (loan author).
