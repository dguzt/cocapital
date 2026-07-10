# CoCapital — Security Audit

**Date:** 2026-07-09
**Scope:** the `app/` Next.js application (App Router, Clerk auth, Drizzle ORM on Neon Postgres, Vercel).
**Method:** three parallel focused audits (auth/authorization, secrets/injection/input-validation, config/infra) plus direct code reading of every server action, page, data-layer query, the middleware (`src/proxy.ts`), and the domain logic.

## TL;DR

The application is **fundamentally well-built**. Authentication is enforced both by middleware (`src/proxy.ts` → `clerkMiddleware` + `auth.protect()`) *and* by defense-in-depth `requireUser()` calls in every server action and page. The data layer scopes **every** query by a `groupId` that is derived server-side from the authenticated user's membership and never accepted from the client — we found **no IDOR / cross-tenant data leak**, **no SQL injection**, **no committed secrets**, and **no XSS**.

The real risk is **integrity of the shared financial ledger**. Two group members co-own a set of capital/loan numbers they later settle on, and two code paths let one member silently corrupt those numbers:

- **C1 (Critical):** loan creation performs no server-side value validation, so a crafted request mints phantom capital and profit.
- **H1 (High):** the movement-edit flow trusts a client-supplied "before" snapshot, allowing a hidden `type`/`date` change to be smuggled into an approved edit.

Everything else is standard hardening (security headers, GET-side-effects, rate limiting, error boundaries).

## Severity summary

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| C1 | **Critical** | Loan creation accepts unvalidated amounts → phantom capital & profit | Fixed |
| H1 | **High** | Client-controlled snapshot lets a member alter movement `type`/`date` on edit | Fixed |
| M1 | **Medium-High** | Missing security headers → clickjacking on the approval UI | Fixed |
| M2 | **Medium** | State-changing mutation on GET at `/join/[code]` | Fixed |
| L1 | **Low** | Membership invariants are check-then-act with no DB backing | Fixed (unique constraint) |
| L2 | **Low-Medium** | No rate limiting on auth/join/money actions; invite-code modulo bias | Partially fixed (bias); rate limiting documented |
| L3 | **Low** | No error boundaries / controlled error UX | Fixed |
| L4 | **Low** | Dependency advisories (dev-only) | Documented |

---

## C1 — Loan creation accepts unvalidated amounts (Critical)

**Files:** `app/src/backend/modules/loans/actions.ts` (`createLoanAction`), `app/src/backend/modules/loans/data.ts` (`createLoan`), `app/src/backend/modules/capital/domain/derive.ts` (the capital reducer), `app/src/backend/infra/db/schema.ts` (money columns have no CHECK constraint).

### The vulnerability

There is no runtime validation library — TypeScript types are erased at runtime, and a `"use server"` action is a public POST endpoint. An authenticated member can invoke `createLoanAction` directly with an arbitrary JSON body, bypassing the wizard UI entirely.

`createLoan` validated only *arithmetic consistency*:

- `Σ installments.principal === capital`
- each installment `amount > 0` and `principal + interest === amount`

It did **not** validate `capital > 0`, `principal >= 0`, `interest >= 0`, or bound `rateBps`. The money columns (`amount`, `capital`, `principal`, `interest`, `rate_bps`) are plain `integer` with no CHECK constraint, despite the schema comment "always ≥ 0".

The irony: the pure schedule engine (`loans/domain/schedule.ts` → `generateSchedule`) already enforces `capital > 0`, `rate >= 0`, count bounds, and date format. But it runs **client-side** in the wizard; the server never re-ran those checks and simply trusted the `installments` array the client sent.

### Exploit — phantom profit into the shared ledger

Call `createLoanAction` with:

```jsonc
{
  "capital": -1000000,           // negative
  "rateBps": 0,
  "frequency": "monthly",
  "startDate": "2026-07-09",
  "borrower": { "name": "x" },
  "installments": [
    { "number": 1, "dueDate": "2026-08-09",
      "amount": 1, "principal": -1000000, "interest": 1000001 }
  ]
}
```

This passes every original check: `amount (1) > 0`, `principal (-1000000) + interest (1000001) === amount (1)`, and `Σ principal (-1000000) === capital (-1000000)`.

Effect through the capital reducer (`derive.ts`):

1. The auto-written `lend` movement gets `amount = capital = -1000000`. The reducer's `lend` delta is `cash: -m.amount` → **cash increases by 1,000,000 cents (S/ 10,000)**.
2. Collecting the installment (`collectInstallment`) writes a `repay` movement and marks the installment collected; `collectedInterest = Σ interest of collected` → **+1,000,001 cents of phantom "ganancia cobrada"**, and `total` is inflated accordingly.

In a two-person shared ledger these numbers drive equity/settlement between the partners. One member can fabricate capital and profit unilaterally.

**Reproduce:** sign in, be in a group, POST the payload above to the `createLoanAction` server action (or tamper the wizard payload assembled at `loan-wizard.tsx` `confirm()`), then collect the installment and observe the inflated capital/profit on the Panel.

### The fix

Added a pure validator `loans/domain/validate.ts` (`validateNewLoanInput`) that runs **server-side** in `createLoan` before any write. It rejects: non-positive `capital`; negative `principal`/`interest`; out-of-range `rateBps`; malformed `startDate`/`dueDate`; bad installment counts/numbering; and amounts beyond a safe integer-cents ceiling (guards Postgres `integer` overflow). Added DB CHECK constraints on the money columns as defense-in-depth (new migration). Unit tests cover the exploit payload and each rejected class.

---

## H1 — Client-controlled snapshot lets a member alter movement `type`/`date` (High)

**Files:** `app/src/backend/modules/movements/actions.ts` (`proposeEditAction`), `app/src/backend/modules/movements/domain/pending.ts` (`proposeChange`), `app/src/backend/modules/movements/changes-data.ts` (`decideMovementChange`).

### The vulnerability

`proposeEditAction(movementId, input, before)` accepted the entire `before: MovementSnapshot` **from the client** and built `after = { ...before, amount, concept, cost }`. `after.type` and `after.date` therefore came from the client verbatim, never re-validated or compared against the stored movement. `proposeChange` passed `after` through unchanged, and on approval `decideMovementChange` did:

```ts
const movementPatch = { ...outcome.value.action.newSnapshot }; // client-authored
db.update(movements).set(movementPatch).where(eq(movements.id, ...));
```

— the client snapshot spread straight into the UPDATE (classic mass assignment).

### Impact

A member editing an innocuous `expense` can smuggle a `type` flip (`expense → contribute` to inflate their own contributed equity, or `→ lend`) and a `date` change inside a single "edit amount" proposal. The pg enum/date column keep values *syntactically valid*, but reclassification among valid types is financially meaningful (it changes how the reducer buckets the money). The other partner must approve, but the approval UI surfaces only the amount/concept diff — a hidden type/date flip can pass a distracted approver. The server must not rely on the human diff.

**Reproduce:** as a member, call `proposeEditAction` with a forged `before.type` differing from the real movement; have the partner approve; the movement's type/date is changed in the ledger and reflected in capital totals.

### The fix

`proposeMovementChange` already re-reads the real movement from the DB. It now builds `after` by merging only the genuinely editable fields (`amount`, `concept`, `cost`) onto the trusted DB snapshot, preserving `type` and `date` from the row. The client-supplied `before` is no longer trusted for those fields. A regression test proves a forged `type`/`date` cannot change the stored movement after approval.

---

## M1 — Missing security headers → clickjacking on the approval UI (Medium-High)

**File:** `app/next.config.ts` (no `headers()`).

No CSP, HSTS, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` were set. The most concrete consequence: the authenticated approval UI is **clickjacking-able** — an attacker can iframe the dashboard and trick a signed-in partner into clicking "approve" on a money movement (`decideChangeAction`).

**Fix:** added an `async headers()` block returning `X-Frame-Options: DENY` + a CSP `frame-ancestors 'none'` (the two controls that close the clickjacking threat), plus `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy` denying camera/microphone/geolocation. A full `script-src`/`connect-src` CSP is intentionally deferred as a follow-up: it must allow-list the Clerk frontend-API origin (which differs between the dev and prod Clerk instances) and be verified end-to-end, or it will break auth.

---

## M2 — State-changing mutation on GET at `/join/[code]` (Medium)

**File:** `app/src/app/join/[code]/page.tsx`.

The page render called `joinGroup()` — a DB insert — during a GET. Merely navigating or prefetching `/join/<code>` silently joined the user to that group. With one-group-per-user enforced and **no leave-group feature**, a victim could be permanently trapped in an attacker's group; Next.js `<Link>` prefetch or link-preview bots could trigger it.

**Fix:** the page now only *displays* the invite; joining happens via an explicit POST server action (`joinGroupAction`) behind a "Unirme al grupo" button. Rendering is side-effect-free again.

---

## L1 — Membership invariants had no DB backing (Low)

**Files:** `app/src/backend/modules/groups/data.ts`, `app/src/backend/infra/db/schema.ts`.

"One group per user" and the 2-member cap were enforced by read-then-insert with no covering constraint. The `memberships` PK is `(group_id, user_id)`, so under concurrency a user could end up in multiple groups or a group could reach 3+ members — breaking the two-party trust model that the whole "the other partner approves" design assumes.

**Fix:** added a unique constraint on `memberships.user_id` (DB-enforced one-group-per-user; new migration). The 2-member cap is documented as a residual TOCTOU (a DB trigger would be needed to fully close it; the unique-on-user_id constraint plus the app check make a >2 member group require a precise concurrent race that is now much narrower).

---

## L2 — No rate limiting; invite-code modulo bias (Low-Medium)

**Files:** `app/src/proxy.ts`, all server actions, `app/src/backend/modules/groups/domain/rules.ts`.

There is no throttling anywhere. Invite-code probing has a large keyspace (`31^8 ≈ 8.5×10¹¹`, so brute force is impractical) but is uncapped, and money/approval actions can be spammed (DB abuse/DoS). Auth + group-scoping bound the blast radius.

Contributing weakness: `makeInviteCode` mapped random bytes with `byte % 31`, introducing modulo bias (indices 0–7 slightly favored, since `256 % 31 = 8`), marginally reducing entropy.

**Fix:** invite-code generation now uses **rejection sampling** (unbiased). **Rate limiting is documented as a follow-up requiring infrastructure provisioning** (e.g. `@upstash/ratelimit` keyed on the Clerk `userId`) — it is intentionally *not* committed as an unconfigured external dependency, to keep that infra decision in the founder's hands.

---

## L3 — No error boundaries / controlled error UX (Low)

There were no `error.tsx`, `global-error.tsx`, or `not-found.tsx`. `requireUser()` throwing, or a DB failure during render, fell through to Next's default error page. Production masks stack traces (so real info leakage is limited), but there was no controlled UX. Server-side error `message` fields embed identifiers (`movementId`, invite `code`, …) — these are currently kept server-side (actions surface only `error.kind`); keep them out of any client payload.

**Fix:** added `global-error.tsx` and a route-level `error.tsx` rendering a generic Spanish message and logging server-side only.

---

## L4 — Dependency advisories, dev-only (Low)

`npm audit`: **6 moderate, 0 high, 0 critical**.

- `drizzle-kit → @esbuild-kit/* → esbuild <= 0.24.2` — GHSA-67mh-4wv8-2f99 (dev tooling only, not shipped to production).
- `next` / `postcss` — a moderate advisory with no clean forward fix currently offered.

**Guidance:** track upstream and upgrade `drizzle-kit` forward when the deprecated `@esbuild-kit/*` chain is dropped. Do **not** act on `npm audit`'s bogus downgrade suggestions (`next@9.3.3`, `drizzle-kit@0.18.1`) — they are major regressions.

---

## Confirmed NOT vulnerable (verified, not assumed)

- **Authentication** — enforced by `src/proxy.ts` (`clerkMiddleware` + `auth.protect()` for every non-public route) *and* defense-in-depth `requireUser()`/`getCurrentUser()` in every action and page. A broken middleware would degrade the sign-in redirect UX but would not leak data (pages/actions would throw).
- **Tenant isolation / IDOR** — every data-layer read/write filters by a server-derived `groupId`; `groupId`/`userId` are never accepted from the client. By-ID fetches (`getLoan`, `collectInstallment`, `proposeMovementChange`, `decideMovementChange`, `listMovementHistory`) re-scope to the caller's group. No cross-group access found.
- **SQL injection** — all queries use the parameterized Drizzle query builder. The only raw `sql` template is a static partial-index predicate in `schema.ts` (a column reference, not user data).
- **Secrets** — only `.env.example` (blank) is tracked; `.gitignore` covers `.env*`; git history is clean; no `NEXT_PUBLIC_*` usage; `requireEnv` names variables but never logs values.
- **XSS** — no `dangerouslySetInnerHTML`/`innerHTML`; user strings render through auto-escaping JSX; the `?error=` param is rendered as text via a fixed lookup map.
- **CORS** — no route handlers and no CORS config; Server Actions are same-origin POST by design.
- **Cookies/sessions** — fully delegated to Clerk (no hand-rolled session cookies to misconfigure). *Verify Clerk dashboard session lifetime / SameSite settings.*
- **Logging** — no `console.*` in shipped `src/`; no secrets/PII/request bodies logged.
- **Concurrency guards** — double-collect is blocked by a conditional `WHERE status='pending'` update; self-approval is blocked in the domain layer (`SelfApproval`); at most one pending change per movement is enforced by a partial unique index.
