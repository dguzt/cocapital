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
import { CreditSales } from "./credit-sales.table";

export const saleInstallmentStatus = pgEnum("sale_installment_status", [
  "pending",
  "collected",
]);

/** One cuota of a credit sale; number 0 is the down payment. */
export const CreditSaleInstallments = pgTable(
  "credit_sale_installments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => CreditSales.id),
    number: integer("number").notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    amount: integer("amount").notNull(),
    status: saleInstallmentStatus("status").notNull().default("pending"),
    /** The part of the cobro that recovered cost; null while pending. */
    costShare: integer("cost_share"),
    collectedAt: timestamp("collected_at"),
    /** The collect_sale movement of the cobro; null while pending. */
    collectMovementId: uuid("collect_movement_id").references(
      () => Movements.id,
    ),
  },
  (t) => [index("credit_sale_installments_sale_idx").on(t.saleId)],
);
