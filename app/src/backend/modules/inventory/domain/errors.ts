import type { AppError } from "@/lib/result";

/** The expected ways a credit sale command can fail. */
export type CreditSaleError =
  | AppError<"InvalidPrice", { price: number }>
  | AppError<"InvalidCost", { cost: number }>
  | AppError<"InvalidDownPayment", { downPayment: number }>
  | AppError<"InvalidInstallmentCount", { installmentCount: number }>
  | AppError<"InvalidStartDate", { startDate: string }>
  | AppError<"InvalidInstallments", { reason: string }>
  | AppError<"ScheduleMismatch", { scheduled: number; expected: number }>
  | AppError<"ItemRequired">
  | AppError<"CreditSaleNotFound", { saleId: string }>
  | AppError<"CreditSaleVoided", { saleId: string }>
  | AppError<"InstallmentNotCollectable", { installmentId: string }>;
