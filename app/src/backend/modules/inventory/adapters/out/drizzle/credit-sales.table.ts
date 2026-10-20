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
import { Contacts } from "@/backend/modules/contacts/adapters/out/drizzle/contacts.table";
import { Groups } from "@/backend/modules/groups/adapters/out/drizzle/groups.table";
import { frequency } from "@/backend/modules/loans/adapters/out/drizzle/loans.table";
import { Movements } from "@/backend/modules/movements/adapters/out/drizzle/movements.table";

export const creditSaleStatus = pgEnum("credit_sale_status", [
  "active",
  "voided",
]);

/** Goods sold to a contact and paid in cuotas. */
export const CreditSales = pgTable(
  "credit_sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => Groups.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => Users.id),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => Contacts.id),
    item: text("item").notNull(),
    /** Cents. */
    price: integer("price").notNull(),
    /** Cents; null when the cost was not given. */
    cost: integer("cost"),
    frequency: frequency("frequency").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    status: creditSaleStatus("status").notNull().default("active"),
    /** The sell_on_credit movement that took the cost out of inventory. */
    saleMovementId: uuid("sale_movement_id")
      .notNull()
      .references(() => Movements.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("credit_sales_group_idx").on(t.groupId)],
);
