/**
 * Schedule engine (TASK-301) — CoCapital's core math.
 * Flat interest, equal split (D3 #2, locked D4): total = capital × (1 + rate);
 * remainders go to the LAST cuota (D5). Pure: no I/O, no dates-now.
 */
import { addPeriods, type Frequency, type ISODate } from "@/lib/dates";
import { type Centimos, splitEvenly } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";
import type { ScheduleError } from "./errors";

export type ScheduleInput = {
  /** Principal in céntimos, > 0. */
  capital: Centimos;
  /** Flat rate over the WHOLE loan: 10 = 10% total, not annual. */
  ratePercent: number;
  nCuotas: number;
  frequency: Frequency;
  /** Loan start; first cuota = start + 1 period (D3 #4). */
  startDate: ISODate;
};

export type ScheduledInstallment = {
  number: number;
  dueDate: ISODate;
  amount: Centimos;
  principal: Centimos;
  interest: Centimos;
};

export type Schedule = {
  capital: Centimos;
  interest: Centimos;
  total: Centimos;
  installments: ScheduledInstallment[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CUOTAS = 360;

export function generateSchedule(
  input: ScheduleInput,
): Result<Schedule, ScheduleError> {
  const { capital, ratePercent, nCuotas, frequency, startDate } = input;

  if (!Number.isInteger(capital) || capital <= 0) {
    return err({
      kind: "InvalidCapital",
      message: `capital debe ser un entero positivo en céntimos, recibido ${capital}`,
      capital,
    });
  }
  if (!Number.isFinite(ratePercent) || ratePercent < 0) {
    return err({
      kind: "InvalidRate",
      message: `interés debe ser ≥ 0%, recibido ${ratePercent}`,
      ratePercent,
    });
  }
  if (!Number.isInteger(nCuotas) || nCuotas < 1 || nCuotas > MAX_CUOTAS) {
    return err({
      kind: "InvalidCuotas",
      message: `número de cuotas debe estar entre 1 y ${MAX_CUOTAS}, recibido ${nCuotas}`,
      nCuotas,
    });
  }
  if (!ISO_DATE.test(startDate) || Number.isNaN(Date.parse(startDate))) {
    return err({
      kind: "InvalidStartDate",
      message: `fecha de inicio inválida: ${startDate}`,
      startDate,
    });
  }

  const interest = Math.round((capital * ratePercent) / 100);
  const total = capital + interest;

  // Derivation guarantees the D5 invariants by construction:
  // Σamounts = total, Σprincipals = capital, and per row
  // interest = amount − principal ⇒ Σinterests = interest.
  const amounts = splitEvenly(total, nCuotas);
  const principals = splitEvenly(capital, nCuotas);

  const installments: ScheduledInstallment[] = amounts.map((amount, i) => ({
    number: i + 1,
    dueDate: addPeriods(startDate, frequency, i + 1),
    amount,
    principal: principals[i],
    interest: amount - principals[i],
  }));

  return ok({ capital, interest, total, installments });
}
