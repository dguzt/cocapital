import type { Frequency, ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";

export type NewLoanInstallment = {
  number: number;
  dueDate: ISODate;
  amount: Cents;
  principal: Cents;
  interest: Cents;
};

export type NewLoan = {
  borrower: { id: string } | { name: string; phone?: string };
  capital: Cents;
  rateBps: number;
  frequency: Frequency;
  startDate: ISODate;
  installments: NewLoanInstallment[];
};

export type InstallmentStatus = "pending" | "collected";

export type LoanStatus = "active" | "voided";

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

export type LoanDetail = {
  id: string;
  borrowerName: string;
  capital: Cents;
  rateBps: number;
  frequency: Frequency;
  status: LoanStatus;
  /** The loan's `lend` movement — a pending void on it IS a pending
   *  cancellation, surfaced on the loan page. */
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
    /** The `repay` movement of the collection — lets the detail page spot a
     *  pending "deshacer cobro" waiting for the partner's OK. */
    repayMovementId: string | null;
  }[];
};
