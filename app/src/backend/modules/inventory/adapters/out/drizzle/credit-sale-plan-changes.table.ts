import { index, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { Users } from "@/backend/modules/accounts/adapters/out/drizzle/users.table";
import { CreditSales } from "./credit-sales.table";

/** Every rewrite of a credit sale's pending cuotas. */
export const CreditSalePlanChanges = pgTable(
  "credit_sale_plan_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => CreditSales.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => Users.id),
    fromCount: integer("from_count").notNull(),
    toCount: integer("to_count").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("credit_sale_plan_changes_sale_idx").on(t.saleId)],
);
