import type { Cents } from "@/lib/money";
import type { InstallmentStatus } from "./installment-status";

/** Every cuota of a status in the group's live loans, added up. */
export type InstallmentTotal = {
  status: InstallmentStatus;
  principal: Cents;
  interest: Cents;
};
