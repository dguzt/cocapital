import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { InstallmentStatus } from "./installment-status";
import type { LoanStatus } from "./loan-status";

/** One cuota of one loan, flattened with the loan it belongs to. */
export type LoanScheduleRow = {
  id: string;
  capital: Cents;
  status: LoanStatus;
  borrowerName: string;
  instStatus: InstallmentStatus;
  instAmount: Cents;
  instDue: ISODate;
};
