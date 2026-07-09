/**
 * Full MVP schema (D4 scope). All money columns are integer cents (D5);
 * all financial rows are scoped by group_id; identifiers English, UI Spanish.
 * Ownership: users→M1 · groups/memberships→M2 · movements/movement_changes→M3
 * · borrowers/loans/installments→M4. M5 owns nothing (pure reducer).
 */
import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ── M1 · accounts ────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── M2 · groups (fixed 2-person for MVP, D4) ────────────────────────────────
export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    /** Only 'member' behaves in MVP; creator flagged for future E5 roles. */
    role: text("role", { enum: ["creator", "member"] })
      .notNull()
      .default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.userId] }),
    index("memberships_user_idx").on(t.userId),
  ],
);

// ── M3 · movements (the ledger, append-only) ────────────────────────────────
export const movementType = pgEnum("movement_type", [
  "contribute",
  "buy_inventory",
  "sell_inventory",
  "lend",
  "repay",
  "expense",
]);
export const movementStatus = pgEnum("movement_status", ["active", "voided"]);

export const movements = pgTable(
  "movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: movementType("type").notNull(),
    /** Integer cents, always ≥ 0; sign semantics live in the reducer. */
    amount: integer("amount").notNull(),
    /** sell_inventory only: cost of goods (cents). null ⇒ margin 0. */
    cost: integer("cost"),
    concept: text("concept"),
    /** Calendar day the event belongs to (Lima). */
    date: date("date", { mode: "string" }).notNull(),
    status: movementStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("movements_group_created_idx").on(t.groupId, t.createdAt)],
);

// ── M3 · pending changes + immutable history (E4/D1) ───────────────────────
// One table plays both roles: rows are append-only; the only mutation ever
// allowed is status pending → approved|rejected (+decidedBy/decidedAt).
// EditLog (M3 spec) = every non-pending row.
export const changeKind = pgEnum("change_kind", ["edit", "void"]);
export const changeStatus = pgEnum("change_status", [
  "pending",
  "approved",
  "rejected",
]);

export const movementChanges = pgTable(
  "movement_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    movementId: uuid("movement_id")
      .notNull()
      .references(() => movements.id),
    kind: changeKind("kind").notNull(),
    proposedBy: uuid("proposed_by")
      .notNull()
      .references(() => users.id),
    /** MovementSnapshot at proposal time — the immutable "before". */
    before: jsonb("before").notNull(),
    /** MovementSnapshot proposed (edit) or null (void). */
    after: jsonb("after"),
    status: changeStatus("status").notNull().default("pending"),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("movement_changes_movement_idx").on(t.movementId),
    // At most ONE undecided change per movement (state machine invariant).
    uniqueIndex("movement_changes_one_pending_idx")
      .on(t.movementId)
      .where(sql`${t.status} = 'pending'`),
  ],
);

// ── M4 · lending ─────────────────────────────────────────────────────────────
export const frequency = pgEnum("frequency", [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
]);
export const installmentStatus = pgEnum("installment_status", [
  "pending",
  "collected",
]);

export const borrowers = pgTable(
  "borrowers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    name: text("name").notNull(),
    phone: text("phone"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("borrowers_group_idx").on(t.groupId)],
);

export const loans = pgTable(
  "loans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    borrowerId: uuid("borrower_id")
      .notNull()
      .references(() => borrowers.id),
    /** Principal in cents. */
    capital: integer("capital").notNull(),
    /** Flat rate in basis points over the whole loan: 10.5% = 1050. */
    rateBps: integer("rate_bps").notNull(),
    installmentCount: integer("installment_count").notNull(),
    frequency: frequency("frequency").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    /** The auto-written lend movement (traceability M4 → M3). */
    lendMovementId: uuid("lend_movement_id")
      .notNull()
      .references(() => movements.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("loans_group_idx").on(t.groupId)],
);

export const installments = pgTable(
  "installments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loanId: uuid("loan_id")
      .notNull()
      .references(() => loans.id),
    number: integer("number").notNull(),
    /** Editable in the wizard; overdue is DERIVED at render, never stored. */
    dueDate: date("due_date", { mode: "string" }).notNull(),
    amount: integer("amount").notNull(),
    principal: integer("principal").notNull(),
    interest: integer("interest").notNull(),
    status: installmentStatus("status").notNull().default("pending"),
    collectedAt: timestamp("collected_at"),
    /** The auto-written repay movement once collected. */
    repayMovementId: uuid("repay_movement_id").references(() => movements.id),
  },
  (t) => [index("installments_loan_idx").on(t.loanId)],
);
