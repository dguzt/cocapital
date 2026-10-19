import type { Frequency, ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { LoanStatus } from "./loan-status";

/** A loan's own fields and its borrower's name, without the schedule. */
export type LoanHeader = {
  id: string;
  capital: Cents;
  rateBps: number;
  frequency: Frequency;
  status: LoanStatus;
  startDate: ISODate;
  lendMovementId: string;
  borrowerName: string;
};
