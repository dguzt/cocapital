/**
 * M3 · the ledger. Append-only: rows are never updated on creation, and never
 * deleted — "borrar" is status = 'voided'.
 */
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

/** Fixed list (vision decision #3). lend/repay are auto-written by M4. */
export const movementType = pgEnum("movement_type", [
  "contribute",
  "buy_inventory",
  "sell_inventory",
  "lend",
  "repay",
  "expense",
]);

export const movementStatus = pgEnum("movement_status", ["active", "voided"]);

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
    /** Integer cents, always >= 0; sign semantics live in the reducer. */
    amount: integer("amount").notNull(),
    /** sell_inventory only: cost of goods (cents). null => margin 0. */
    cost: integer("cost"),
    concept: text("concept"),
    /** Calendar day the event belongs to (Lima). */
    date: date("date", { mode: "string" }).notNull(),
    status: movementStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("movements_group_created_idx").on(t.groupId, t.createdAt)],
);
