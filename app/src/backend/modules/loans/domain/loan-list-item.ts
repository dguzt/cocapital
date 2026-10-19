import type { Cents } from "@/lib/money";
import type { LoanStatus } from "./loan-status";

/** A loan as its card in the list shows it. */
export type LoanListItem = {
  id: string;
  borrowerName: string;
  capital: Cents;
  status: LoanStatus;
  collectedCount: number;
  totalCount: number;
  overdueCount: number;
  pendingAmount: Cents;
};
