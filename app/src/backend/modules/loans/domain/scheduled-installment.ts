import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";

/** One cuota of a schedule: its due date and how it splits into principal and interest. */
export type ScheduledInstallment = {
  number: number;
  dueDate: ISODate;
  amount: Cents;
  principal: Cents;
  interest: Cents;
};
