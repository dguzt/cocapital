import type { Frequency, ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";

/** A loan about to be stored, already booked in the ledger. */
export type LoanEntry = {
  groupId: string;
  userId: string;
  borrowerId: string;
  capital: Cents;
  rateBps: number;
  installmentCount: number;
  frequency: Frequency;
  startDate: ISODate;
  lendMovementId: string;
};
