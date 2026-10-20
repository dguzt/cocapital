# CoCapital — Product Decisions Log

> Running record of product decisions + rationale. One entry per decision. Newest on top.

---

## D6 — Venta en cuotas (credit sales) + contacts

**Date:** 2026-10-20
**Status:** ✅ Locked (grilling session). Requested by Ricardo. UI mock: https://claude.ai/artifact/NUVhwsDu5UbxUJby2zVYdg

1. **Cash-basis, like loan interest.** The margin enters the capital only as cuotas are collected. No accrual.
2. **Bucket `receivable` = "Cuentas por cobrar", valued at cost.** `total = cash + inventory + lent + receivable`; selling on credit never lowers the total. Pending margin is shown apart and never counts; collected margin adds to "Por ventas". Derived **only from the ledger**.
3. **Proportional split per cobro.** Each cobro splits `cost/price`: part recovers cost, the rest is margin. Computed once at collection, stored on the movement (`cost`). The cuota that settles the sale takes the remaining cost, so recovered cost sums exactly. Cost is optional (as today): no cost ⇒ no margin.
4. **Ledger:** `sell_on_credit` (amount = price, cost = cost; inventory −cost, receivable +cost) and `collect_sale` (amount = cobro, cost = cost share; cash +amount, receivable −share, salesProfit +rest).
5. **Module `inventory`, entity `CreditSale`** with stored cuotas (due date + amount), editable at creation exactly like the loan wizard. No interest.
6. **Pago inicial** optional = a cuota "Inicial" collected in the same transaction.
7. **Cobro per cuota, like loans.** Adelantar = collect a later cuota early. **"Cambiar plan"** rewrites the uncollected cuotas (stretch, or split a cuota for a partial payment): no OK, shown in the activity.
8. **The schedule must add up.** Σ cuotas = price (at creation) and Σ uncollected = pending (at re-plan), or Confirmar stays disabled. A price change = void + recreate.
9. **Void cascades** over the sale's cobros (like `VoidLoan`), one double-confirmation, dialog says how many cobros. Undo of one cobro reopens its cuota. Owners declared in `apply-approved-change.ts`.
10. **Buyer = contact.** New module `contacts` replaces loans' `borrowers` (one person can borrow and buy).
11. **UI:** one "Vender" tile → `/ventas/nueva` with tabs **Al contado | En cuotas**; `/ventas` and `/ventas/[id]` mirror the loan pages.
12. **Two PRs.** PR A = contacts refactor, migration 0003 renames `borrowers`→`contacts` and leaves a bridge view `borrowers` so prod code keeps working between migrate and deploy. PR B = the feature; its migration drops the bridge view. Prod is migrated before each deploy.

**Accepted risks:** re-planning needs no OK (visible in activity) · no direct partial payment (split via Cambiar plan) · no edit of a created sale · cost typed by hand (a product catalog is a future epic).

---

## D5 — Ship-day decisions (money, domain, E4, auth) + assumptions

**Date:** 2026-07-09
**Status:** ✅ Locked for the 12-hour MVP deploy.

1. **Money = integer céntimos, last cuota absorbs the remainder.** All amounts stored as integer céntimos (`bigint`-free, plain int). Equal split rounds down; the last cuota takes the leftover. Invariants (test-enforced): `Σcuotas = total`, `Σprincipal = capital`, `Σinterest = interés`, `principal + interest = cuota` per row.
2. **Test URL = cocapital.vercel.app.** workers.dev rejected — it's Cloudflare's domain and can't front Vercel; deploying on Workers (OpenNext) = platform risk on a ship day. Custom domain later.
3. **E4 blocks the deploy — no valve.** Double-confirmation ships today or we don't deploy. (Reaffirms D4 #1.) Pressure valves are the P1/P2 cosmetics instead (UC-306 cut; UC-203/305 polish).
4. **Clerk:** founder creates the app at the hour-3 gate; user mirror happens on first authed request (no webhooks in MVP).

**Assumptions taken (veto window passed):** Vencida "today" = America/Lima, `due_date` is a plain date · mensual clamps to month-end (Ene 31 → Feb 28), diario/semanal/quincenal = +1/+7/+15 días, anchor day preserved across months · concept optional · creation needs no partner OK (only edits/voids) · invite link reusable until 2/2 then dead · UI Spanish, phone-first, per Claude Design prototype · cobro writes via `db.batch()` (neon-http has no interactive transactions — verified).

---

## D4 — MVP scope & build order (decompose gate)

**Date:** 2026-07-06
**Status:** ✅ Locked. Closes the four ⚠ warnings from the blueprint. Feeds `specs/modules/*` + `specs/epics/*`.

Resolutions after reviewing the modules/epics blueprint:

1. **E4 (Trust & corrections / double-confirmation) is IN the MVP.** Two friends share one ledger, so the mistype problem is real on day one. This **overrides D3 item 9** ("double-confirmation out of prototype") — that call was for the throwaway prototype; this is the real build. D1's double-confirmation applies to movement edits/voids from the first release.
2. **E3 calc method = flat interest, equal split — CONFIRMED / good enough** (per D3 item 2). Build it as-is; revisit only if a real customer computes differently.
3. **E5 (Group administration — N partners, roles, invites) = OUT / post-validation.** MVP hardcodes the **fixed 2-person group**. No invite/manage UI yet. Avoids the over-thinking we pulled back from.
4. **Build order = E1 → E2 → E3 → E4, in order.** Onboarding, then record-movement+capital, then lending lifecycle, then corrections. Linear and supervised, one usecase at a time.

**MVP epic set:** E1, E2, E3, E4. **Deferred:** E5 (post-validation). **Modules:** M1 Accounts · M2 Groups · M3 Movements · M4 Loans · M5 Capital (read-model).

---

## D3 — Loans MVP: resolved flow & calc method (grilling session)

**Date:** 2026-07-03
**Status:** ✅ Design resolved — ready to prototype in Claude Design. Supersedes the open items in D2.

Outcome of a grilling session that turned D2's direction into a buildable MVP. Each item below is a locked decision.

**1. Loan shape (A+C mix).** Lender defines: monto (e.g. S/300), interés as a **flat total rate over the whole loan** (10% → total S/330), **# de cuotas** (e.g. 4), and **frecuencia**. App computes dates + per-cuota amounts. No open-ended / balance-based loans.

**2. Calc method — LOCKED = simple flat interest, equal split.** `total = capital × (1 + rate)`; each cuota = `total / N`; principal share = `capital / N`, interest share = `interest / N`. (Resolves D2's open blocker. French/interest-only dropped for MVP.)

**3. Installment editing = free edit, total floats (option B).** Amounts *and* dates are editable. Editing one cuota does NOT redistribute others; the sum may drift from the loan total. Always show a running **"programado S/X vs. préstamo S/Y"** so any mismatch is visible, never silent. (No redistribution logic to build.)

**4. Frequency + first date.** Fixed picker **{Diario, Semanal, Quincenal, Mensual}**. First cuota = **start date + one period**. All dates editable.

**5. Capital treatment = realized-only (option A).** Creating a loan moves `cash → Prestado` for the **principal only**. Interest is **"ganancia esperada"**, NOT in Capital total. It becomes **"ganancia cobrada"** (and enters Capital total) only as cuotas are collected. Keeps the headline number honest.

**6. Register collection = confirm-the-cuota (option A).** App suggests the next pending cuota; lender confirms like ticking a check. One cobro fully settles one cuota (`Prestado −= principal share`, `cash += amount`, `ganancia cobrada += interest share`). **Partial/overpay out of scope** — iterate later per real customer needs.

**7. Information architecture (hybrid).** Keep all six "+" movement options. Tapping **Préstamo** opens a **different view = the loan wizard** (select-or-create borrower + fields → editable schedule preview → confirm). Tapping **Cobro** opens **pick-loan → confirm-cuota**. Creating a loan writes **both a movement** (hits Prestado + Actividad) **and a loan entity**. A **burger menu** opens the loans list → loan detail. Cobro also reachable inside loan detail.

**8. Borrower = minimal first-class entity (option A).** `Borrower {name, optional phone}`, select-or-create, reusable across loans, persists for future per-borrower history. No borrower profile screen in MVP.

**9. Double-confirmation (D1) = OUT of this prototype (option A).** Create-loan and register-cobro are append-only records → no OK needed. Installment editing confined to the **creation wizard** (nothing committed yet). "Edit an active loan (needs partner OK)" + the whole approval UI = a separate design pass later. Validate one hypothesis at a time.

**10. Statuses.** Stored status is **binary: `Pendiente | Cobrada`** (only source of truth written). **Vencida is always DERIVED at render** (`fecha < hoy && Pendiente`), shown as a red/amber warning on a Pendiente cuota — never stored, no background jobs. Future date edits recompute overdue for free.

**11. Screen set for the first Claude Design pass** (extend existing `CoCapital.dc.html`, keep inventory side intact):
   1. **Préstamo view** — borrower select/create · monto · interés % (live "total S/330 · interés anual ~X%") · # cuotas · frecuencia · fecha inicio → **editable schedule preview** (running programado-vs-préstamo sum) → Confirmar.
   2. **Burger menu → Préstamos list** — per loan: borrower, pendiente, mini-status ("2/4 cobradas · 1 vencida").
   3. **Loan detail** — summary box (prestado · ganancia esperada · cobrado · pendiente · *interés anual ref*) + installment list (Pendiente/Cobrada + Vencida warnings) + Registrar cobro.
   4. **Cobro view** — pick loan/borrower → confirm-the-cuota check.
   5. **Dashboard** — unchanged; "Prestado" reflects loans, Actividad shows auto-written Préstamo/Cobro movements.
   - **Seed data:** Diego + Rosa; borrower **Karina**, loan S/300 @ 10%, 4 cuotas mensuales — 1 cobrada, 1 vencida, 2 pendientes (all states visible).

**Informational only:** show **"interés anual ~X%"** = `rate × (365 / loan_length_in_days)`, labeled as a reference ROI figure, never mixed into Capital total.

**Still out of scope (fast-follows):** partial/prepayment/mora/refinancing, double-confirmation UI, per-borrower history screen, inventory deepening.

---

## D2 — Loans feature: loan as a first-class entity (Option 3)

**Date:** 2026-07-02
**Status:** ✅ Direction confirmed → resolved into a buildable MVP in **D3**. (Open blocker "calc method" is now closed: simple flat interest.)

**Context:** The client's core business is lending money at interest. Question was how interest is captured when registering movements. We evaluated 3 options:
1. **Total amount** — user pre-sums capital + interest into one figure. App knows nothing about the split.
2. **Capital + % (broken out)** — two fields, app computes total and keeps the split. Good for "you earned X in interest".
3. **Loan as an entity** — a loan is its own object (capital, rate, term/installments) that generates a repayment schedule; each payment received decomposes into capital + interest.

**Decision:** Go with **Option 3**. Since the client's core is loans, it's worth the investment. A loan records: borrower, amount, rate, installments, computed collection dates (editable), and a summary of collections + earnings. When a payment is collected it should match the due installment and amortizes both the lent capital and the corresponding interest.

**Domain model (3 pieces):**
- **Loan** — the "card": borrower, capital, rate, # installments, frequency, start date. Created once.
- **Installment** — generated *by the system* from the loan: number, expected date (editable), amount, and its capital/interest split. Has a status (pending / collected / partial / overdue).
- **Collection (payment)** — when money comes in: applied to an installment, amortizes capital + interest, updates the outstanding balance.
- Golden rule: the lender **creates Loans and registers Collections**. Installments are never typed by hand — they are the system's output. That's where the value is.

**User flow (how it's offered, in 3 moments):**
1. **Register loan** (short wizard): to whom, how much, what rate, how many installments, how often, from when → app shows the **schedule as an editable preview** → confirm.
2. **View the loan**: top = **summary box** (capital lent · expected earnings · already collected · outstanding); bottom = installment list with statuses.
3. **Register collection**: app suggests the next installment, user confirms the amount received → auto-amortizes and the installment flips to "collected".

**OPEN DECISION that unblocks everything — schedule calculation method:**
- **Simple flat interest** — interest = capital × rate × term, split equally across installments. Easy to grasp, typical of informal lenders. *(Recommended to start.)*
- **Fixed installment / French system** — equal installments, interest on outstanding balance (more interest early). What banks use, more complex.
- **Interest-only + principal at end** — pay only interest each period, capital at the close.
- ⚠️ Need to ask the client: **what method do they use today** to compute installments?

**Edge cases — named, NOT in the first prototype:** partial payment, principal prepayment / early payment, late-payment penalty (mora), refinancing.

**Cross-cutting:** the **double-confirmation** rule from D1 applies here → decide whether it's required when *creating a loan*, when *registering a collection*, or both.

**Loop A proposal:** don't build the full engine. Build a **visual prototype** of the 3 moments, with simple flat interest and no edge cases, and validate: *does the lender trust the auto-generated schedule and feel that registering a collection is fast?*

**Next-session TODO:**
- Get the client's actual installment-calculation method → lock the calc method.
- Choose prototyping path: (a) visual prototype of the flow in Claude Design, or (b) Mermaid diagram of model + flow first.
- Decide where double-confirmation applies (create loan vs. register collection).
- Later (out of scope for now): inventory feature.

---

## D1 — Movement edit mechanism: Double confirmation

**Date:** 2026-07-02
**Status:** ✅ Decided (implement) · other models are backlog to evaluate

**Context:** In a group of 2 (or more) members sharing one movements ledger, what happens if someone mistypes a value? Edits must be allowed, but they need a mechanism that doesn't break trust with the partner.

**Decision:** Implement **Double confirmation** — any change to a movement (edit/void) requires the other group member(s)' OK before it takes effect.

**Only this is implemented now.** Later we'll assess how feasible/realistic it is to support the other models.

**Future vision (NOT now):** offer the mechanism as **configurable per group/client**, since different clients may prefer a different way of working. The **future default would be Free editing + log**, not Double confirmation. Recorded as intent, without committing architecture yet.

**Alternatives considered:**
- **Immutable ledger** — no editing; errors are fixed with an adjustment movement. Max trust by design, less intuitive UX.
- **Free editing + log** — edit anytime, every change in a visible history + notification to the partner. Trust via transparency. *(Candidate future default.)*
- **Window + approval** — same-day free edit; after that the change stays pending until the partner accepts.
- **Double confirmation** — *(chosen)* every change needs the other's OK. Max trust, more friction.

**Cross-cutting basics (apply to any mechanism, always include):**
- **Immutable** action history (e.g. "Ana changed S/50 → S/45 on Jul 2").
- Never a physical delete: "delete" = void, still visible in the history.

**Pending / for another session:**
- Assess feasibility and realism of implementing all 4 mechanisms as a configurable option.
- Define how double confirmation behaves on movement **creation** (does it also require an OK, or only later changes?).
- Define scope for groups of more than 2 members (all approve, or majority?).
