import type { Frequency, ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { InstallmentStatus } from "./installment-status";
import type { LoanStatus } from "./loan-status";

/** A loan with its schedule and totals, as its page shows it. */
export type LoanDetail = {
  id: string;
  borrowerName: string;
  capital: Cents;
  rateBps: number;
  frequency: Frequency;
  status: LoanStatus;
  /** The lend movement; a pending void on it is a pending cancellation. */
  lendMovementId: string;
  startDate: ISODate;
  expectedInterest: Cents;
  collectedAmount: Cents;
  pendingAmount: Cents;
  installments: {
    id: string;
    number: number;
    dueDate: ISODate;
    amount: Cents;
    principal: Cents;
    interest: Cents;
    status: InstallmentStatus;
    /** The repay movement of the collection; null while pending. */
    repayMovementId: string | null;
  }[];
};
