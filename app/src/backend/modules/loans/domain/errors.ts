import type { AppError } from "@/lib/result";

export type ScheduleError =
  | AppError<"InvalidCapital", { capital: number }>
  | AppError<"InvalidRate", { ratePercent: number }>
  | AppError<"InvalidInstallmentCount", { installmentCount: number }>
  | AppError<"InvalidStartDate", { startDate: string }>;

export type LoanError =
  | AppError<"BorrowerNameRequired">
  | AppError<"BorrowerNotFound", { borrowerId: string }>
  | AppError<"LoanNotFound", { loanId: string }>
  | AppError<"InvalidInstallments", { reason: string }>
  | AppError<"InstallmentNotCollectable", { installmentId: string }>;
