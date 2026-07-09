import type { AppError } from "@/lib/result";

export type ScheduleError =
  | AppError<"InvalidCapital", { capital: number }>
  | AppError<"InvalidRate", { ratePercent: number }>
  | AppError<"InvalidInstallmentCount", { installmentCount: number }>
  | AppError<"InvalidStartDate", { startDate: string }>;
