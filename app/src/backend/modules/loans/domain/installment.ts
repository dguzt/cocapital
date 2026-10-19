import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { InstallmentStatus } from "./loan";

/** One cuota of a loan as it is stored. */
export type Installment = {
  id: string;
  loanId: string;
  number: number;
  dueDate: ISODate;
  amount: Cents;
  principal: Cents;
  interest: Cents;
  status: InstallmentStatus;
  collectedAt: Date | null;
  repayMovementId: string | null;
};
