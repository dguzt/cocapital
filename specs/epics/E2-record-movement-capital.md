# Epic: Record movement & see capital

- **ID:** EPIC-002 (E2)
- **One-liner:** Either partner records a typed movement in ~10s and the shared capital updates instantly.
- **Priority:** P0 — **the riskiest-assumption epic** (vision.md).
- **Hat:** Builder
- **Modules touched:** M3 Movements, M5 Capital
- **Status:** Backlog
- **GitHub issue:** #—

## Why (problem / value)
This is the hypothesis the whole product rests on: *will two friends actually record every movement on their phones instead of a notebook?* If recording isn't near-instant, they abandon it. Everything else is decoration around this loop.

## Outcome / definition of done
From the dashboard, a partner taps "+", picks a type, enters amount + concept, saves — in ~10 seconds on a phone — and the **Total / Efectivo / Inventario / Prestado** figures + Actividad list update immediately for both partners.

## Flow (cross-module)
```
Tap "+" → pick type {contribute·buy·sell·lend·repay·expense}
        → amount + concept → Save
   → M3 appends Movement (active, authored, dated)
   → M5 re-derives Total + buckets + recent activity
   → dashboard reflects it live
```
> `lend` / `repay` are surfaced here but their full flows belong to **E3** (they open the loan wizard / cobro, not a plain amount box).

## Children
| ID | Type | Description | Priority | Size | Module(s) |
|----|------|-------------|----------|------|-----------|
| UC-201 | Usecase | Record a movement (type + amount + concept) in ~10s | P0 | M | M3 |
| UC-202 | Usecase | Dashboard: Total + where-it-is buckets, live | P0 | M | M5 |
| UC-203 | Usecase | Recent activity feed (newest first, author shown) | P1 | S | M3, M5 |
| TASK-201 | Task | Capital read-model: reducer over movements + tests | P0 | M | M5 |

## Open questions
- Does the 10-second target need a bottom-sheet "+" (thumb-reachable) vs. full page? → prototype already leans bottom-sheet; validate on device.
- Concept optional or required? (lean: optional, to keep it fast.)
