import type { Cents } from "@/lib/money";

/** What the capital needs from a cuota. */
export type CapitalInstallment = {
  principal: Cents;
  interest: Cents;
  status: "pending" | "collected";
};
