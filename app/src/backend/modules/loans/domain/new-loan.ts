import type { Frequency, ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { ScheduledInstallment } from "./scheduled-installment";

/** A loan as the wizard sends it: to an existing or a new borrower. */
export type NewLoan = {
  borrower: { id: string } | { name: string; phone?: string };
  capital: Cents;
  rateBps: number;
  frequency: Frequency;
  startDate: ISODate;
  installments: readonly ScheduledInstallment[];
};
