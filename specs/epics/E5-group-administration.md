# Epic: Group administration  — DEFERRED (post-validation)

- **ID:** EPIC-005 (E5)
- **One-liner:** More than two partners, roles, invites, and creator-only management.
- **Priority:** P2 — **NOT in the MVP** (D4).
- **Hat:** Manager
- **Modules touched:** M2 Groups (+ M1)
- **Status:** Deferred until the 2-person MVP is validated.
- **GitHub issue:** #—

## Why deferred
D4: the MVP hardcodes a **fixed 2-person group**. Building N-partner invites/roles/quorum now is the over-thinking we deliberately pulled back from. Validate the core loop with two friends first.

## Scope when revived (not built now)
- Invite a 3rd+ partner; manage/remove members (creator-only).
- Roles & permissions; rename group by creator.
- N-partner approval quorum for E4 corrections (all vs. majority).

## Schema hooks already left in place (M2)
`Membership.role` + creator flag exist so this doesn't need a migration rewrite — only behavior is unbuilt.
