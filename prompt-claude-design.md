# Prompt for Claude Design — CoCapital MVP

## Product overview

Build a **phone-first web app** that helps small groups of people manage shared capital together. This is not a budgeting app, expense tracker, or bill-splitting tool. Its purpose: answer three questions instantly — "How much total capital do we have?", "Where is it right now?", "Is it growing?"

The mental model is **capital movements, not income/expenses**. Money can increase wealth (contributions, sales, interest), change form without changing wealth (cash → inventory, cash → loan receivable), or decrease wealth (expenses, losses).

## Target users

Two friends in Lima, Peru. They pooled S/500 each (S/1000 total) to resell perfumes and lend money to clients. They currently track everything in personal notebooks + WhatsApp. They don't know their total capital, which activity is more profitable, or any ROI metrics. Primary device: phone.

## MVP scope

Only what's listed below. No forecasting, no ROI calculations, no charts, no notifications.

### Must have

- **Auth:** Register + login (email/password via Clerk)
- **Groups:** One user creates a group with a name, gets a shareable invite link (expires 7 days, one-time use). Other user joins via the link after registering.
- **Movement log:** Either member records a movement in ~10 seconds. Types:
  - Contribute (add cash)
  - Buy inventory (cash → goods)
  - Sell inventory (goods → cash, with profit tracked)
  - Lend to client (cash → receivable)
  - Client repaid (receivable → cash, with interest)
  - Expense (cash leaves, capital decreases)
- **Dashboard:** Shows total capital, where it sits (cash/inventory/lent), and recent movements (last 10, newest first). Updates instantly when a movement is recorded.
- **Multi-user:** Both members see the same data. Any member can record a movement.
- **Phone-first:** Every screen must work well on a mobile browser.

### Out of scope

- Forecasts, projections, ROI or performance metrics
- Charts, graphs, visualizations
- Notifications, reminders
- Multiple groups per user
- Payment integrations
- Accounting concepts (double-entry, P&L)

## User flow (happy path)

1. User A opens app → sees Login screen
2. User A taps "Sign up" → Register screen (name, email, password)
3. User A creates a group → names it "Amigos" → gets an invite link
4. User A shares the link via WhatsApp to User B
5. User A lands on Dashboard (empty state — no movements yet, prompt to add first)
6. User A taps "+ Add movement" → selects type, enters amount and concept → saves
7. Dashboard now shows total capital, breakdown bars, and the movement in recent activity
8. User B opens the invite link → sees a "Join Amigos" page
9. User B registers → automatically added to the group → sees the same dashboard with User A's movements already there
10. User B adds a movement → dashboard updates for both

## Tech stack

- Next.js (App Router) + TypeScript
- shadcn/ui components + Tailwind CSS
- Clerk for authentication
- Turso (edge-hosted SQLite) + Drizzle ORM

## Design guidelines

- Minimalist and clean. Apple-like simplicity.
- Easy enough for someone who doesn't understand finance but powerful enough to replace their spreadsheet.
- No accounting jargon. Use plain labels: Available Cash, Inventory, Money Lent, Total Wealth.
- Confident use of numbers — big typography for the total capital figure.
- Warm but professional. This is about people's money.
- The "Add movement" button must be prominent and always within thumb reach.
- Empty states should guide the user to take the next action.
- Activity log should read like a timeline (Today, Yesterday, This week).

## Key screens to design

1. **Login / Register** — standard auth, Clerk pre-built UI or custom
2. **Create group** — simple form: group name → creates group → shows invite link
3. **Invite link screen** — displays the generated link, copy + WhatsApp share buttons, expiry notice
4. **Join group (invite landing)** — shows group name + inviter name, "Join" CTA, redirects to register
5. **Dashboard** — the main screen. Three sections: Total Capital (big number), Where It Is (breakdown with bars), Recent Activity (timeline). Floating or fixed "+" button.
6. **Add movement form** — type selector (dropdown or picker), amount input, concept input. Quick to fill.
7. **Dashboard populated** — same as above but with real data showing.

## Data model (for reference)

**User:** id, name, email, password_hash
**Group:** id, name, invite_code, created_at
**GroupMember:** user_id, group_id, role
**Movement:** id, group_id, user_id, type (enum: contribute/buy/sell/lend/repaid/expense), amount, concept, created_at

Dashboard calculations:
- Total Capital = sum of all contributions – expenses + profits from sales and interest
- Cash = contributions not yet converted to inventory or lent out
- Inventory = cost of items purchased but not yet sold
- Lent = outstanding loan amounts not yet repaid

---

**Deliverable:** Provide the complete UI design as a clickable prototype showing this full flow, ready to implement with shadcn/ui components in a Next.js project.
