import type { Cents } from "@/lib/money";
import type { CreditSaleStatus } from "./credit-sale-status";

/** A credit sale as its card in the list shows it. */
export type CreditSaleListItem = {
  id: string;
  buyerName: string;
  item: string;
  status: CreditSaleStatus;
  collectedCount: number;
  totalCount: number;
  /** Pending cuotas due before today; 0 for a voided sale. */
  overdueCount: number;
  pendingAmount: Cents;
  settled: boolean;
};
