# Epic: Onboarding & shared group

- **ID:** EPIC-001 (E1)
- **One-liner:** A person registers, creates or joins a group, and lands on the shared dashboard.
- **Priority:** P0
- **Hat:** Builder
- **Modules touched:** M1 Accounts, M2 Groups
- **Status:** Backlog
- **GitHub issue:** #—

## Why (problem / value)
Nothing else works until two people share one workspace. This is the front door: identity + the fixed 2-person group that scopes every movement, loan, and capital number.

## Outcome / definition of done
Two real users each have an account, belong to the **same** group, and both see the same (empty) dashboard. Second slot fills → group is closed (2/2).

## Flow (cross-module)
```
User A: register (Clerk) → create group "Amigos" → get invite link
User B: register (Clerk) → open invite link → join group → group full (2/2)
Both  : land on shared dashboard (empty state)
```

## Children
| ID | Type | Description | Priority | Size | Module(s) |
|----|------|-------------|----------|------|-----------|
| UC-101 | Usecase | Register / log in (Clerk) | P0 | S | M1 |
| UC-102 | Usecase | Create a group, get a shareable invite link | P0 | S | M2 |
| UC-103 | Usecase | Join a group via invite link (closes at 2/2) | P0 | M | M2 |
| UC-104 | Usecase | Land on shared dashboard empty state | P1 | S | M2, M5 |

## Open questions
- Invite link: single-use code vs. reusable-until-full? (lean: reusable until 2/2, then dead.)
- What if someone opens an already-full group's link? → "This group is full" screen.
