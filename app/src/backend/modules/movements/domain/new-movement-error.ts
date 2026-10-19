import type { AppError } from "@/lib/result";

/** Why a movement typed by a partner is not valid. */
export type NewMovementError =
  | AppError<"InvalidType", { type: string }>
  | AppError<"InvalidAmount", { input: string }>
  | AppError<"InvalidCost", { input: string }>;
