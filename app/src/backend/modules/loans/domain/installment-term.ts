import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { InstallmentStatus } from "./installment-status";

/** What a cuota still owes or already paid, as the capital summary needs it. */
export type InstallmentTerm = {
  principal: Cents;
  interest: Cents;
  status: InstallmentStatus;
  dueDate: ISODate;
};
