import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";

/** A cuota of a credit sale before it is stored: when it falls due and how much. */
export type PlannedInstallment = {
  dueDate: ISODate;
  amount: Cents;
};
