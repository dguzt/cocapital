/**
 * M4 · one cuota. Status is binary on purpose (D4 scope): a partial payment
 * has nowhere to live yet — that is a schema change, not a button.
 */
import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { Loans } from "./loans";
import { Movements } from "./movements";

export const installmentStatus = pgEnum("installment_status", [
  "pending",
  "collected",
]);

export const Installments = pgTable(
  "installments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loanId: uuid("loan_id")
      .notNull()
      .references(() => Loans.id),
    number: integer("number").notNull(),
    /** Editable in the wizard; overdue is DERIVED at render, never stored. */
    dueDate: date("due_date", { mode: "string" }).notNull(),
    amount: integer("amount").notNull(),
    principal: integer("principal").notNull(),
    interest: integer("interest").notNull(),
    status: installmentStatus("status").notNull().default("pending"),
    collectedAt: timestamp("collected_at"),
    /** The auto-written repay movement once collected; null again if undone. */
    repayMovementId: uuid("repay_movement_id").references(() => Movements.id),
  },
  (t) => [index("installments_loan_idx").on(t.loanId)],
);
