import type { AppError } from "@/lib/result";

export type ScheduleError =
  | AppError<"InvalidCapital", { capital: number }>
  | AppError<"InvalidRate", { ratePercent: number }>
  | AppError<"InvalidCuotas", { nCuotas: number }>
  | AppError<"InvalidStartDate", { startDate: string }>;
