import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { SaleInstallmentStatus } from "./sale-installment-status";

/** One cuota of a credit sale. Number 0 is the down payment. */
export type CreditSaleInstallment = {
  id: string;
  number: number;
  dueDate: ISODate;
  amount: Cents;
  status: SaleInstallmentStatus;
  /** The part of the cobro that recovered cost; null while pending. */
  costShare: Cents | null;
  /** The collect_sale movement of the cobro; null while pending. */
  collectMovementId: string | null;
};
