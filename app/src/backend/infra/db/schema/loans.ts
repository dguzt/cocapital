/** M4 · a loan. Its lend movement is NOT NULL: a loan cannot exist unbooked. */
import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { Users } from "@/backend/modules/accounts/adapters/out/drizzle/users.table";
import { Groups } from "@/backend/modules/groups/adapters/out/drizzle/groups.table";
import { Borrowers } from "./borrowers";
import { Movements } from "./movements";

export const frequency = pgEnum("frequency", [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
]);

/** A loan is `voided` only by cancellation (corrección de un error de captura):
 *  its lend + every repay are voided and its cuotas leave `lent`. */
export const loanStatus = pgEnum("loan_status", ["active", "voided"]);

export const Loans = pgTable(
  "loans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => Groups.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => Users.id),
    borrowerId: uuid("borrower_id")
      .notNull()
      .references(() => Borrowers.id),
    /** Principal in cents. */
    capital: integer("capital").notNull(),
    /** Flat rate in basis points over the whole loan: 10.5% = 1050. */
    rateBps: integer("rate_bps").notNull(),
    installmentCount: integer("installment_count").notNull(),
    frequency: frequency("frequency").notNull(),
    status: loanStatus("status").notNull().default("active"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    /** The auto-written lend movement (traceability M4 -> M3). */
    lendMovementId: uuid("lend_movement_id")
      .notNull()
      .references(() => Movements.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("loans_group_idx").on(t.groupId)],
);
