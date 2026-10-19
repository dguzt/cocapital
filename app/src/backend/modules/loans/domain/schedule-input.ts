import type { Frequency, ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";

/** The terms a schedule is generated from. */
export type ScheduleInput = {
  /** Principal in cents, > 0. */
  capital: Cents;
  /** Flat rate over the whole loan: 10 means 10% in total, not per year. */
  ratePercent: number;
  installmentCount: number;
  frequency: Frequency;
  /** The loan's start; the first cuota falls one period later. */
  startDate: ISODate;
};
