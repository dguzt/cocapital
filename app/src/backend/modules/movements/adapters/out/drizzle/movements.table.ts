import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { Users } from "@/backend/modules/accounts/adapters/out/drizzle/users.table";
import { Groups } from "@/backend/modules/groups/adapters/out/drizzle/groups.table";

export const movementType = pgEnum("movement_type", [
  "contribute",
  "buy_inventory",
  "sell_inventory",
  "lend",
  "repay",
  "expense",
]);

export const movementStatus = pgEnum("movement_status", ["active", "voided"]);

/** The shared ledger: every money event of a group. */
export const Movements = pgTable(
  "movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => Groups.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => Users.id),
    type: movementType("type").notNull(),
    /** Cents, never negative. */
    amount: integer("amount").notNull(),
    /** Cost of goods in cents for a sale, or the principal of a repay. */
    cost: integer("cost"),
    concept: text("concept"),
    /** Calendar day of the event, in Lima. */
    date: date("date", { mode: "string" }).notNull(),
    status: movementStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("movements_group_created_idx").on(t.groupId, t.createdAt)],
);
