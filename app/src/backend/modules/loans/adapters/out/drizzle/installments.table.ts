import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { Movements } from "@/backend/modules/movements/adapters/out/drizzle/movements.table";
import { Loans } from "./loans.table";

export const installmentStatus = pgEnum("installment_status", [
  "pending",
  "collected",
]);

/** One cuota of a loan's schedule. */
export const Installments = pgTable(
  "installments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loanId: uuid("loan_id")
      .notNull()
      .references(() => Loans.id),
    number: integer("number").notNull(),
    /** The day the cuota falls due. */
    dueDate: date("due_date", { mode: "string" }).notNull(),
    amount: integer("amount").notNull(),
    principal: integer("principal").notNull(),
    interest: integer("interest").notNull(),
    status: installmentStatus("status").notNull().default("pending"),
    collectedAt: timestamp("collected_at"),
    /** The repay movement of the collection; null while pending. */
    repayMovementId: uuid("repay_movement_id").references(() => Movements.id),
  },
  (t) => [index("installments_loan_idx").on(t.loanId)],
);
