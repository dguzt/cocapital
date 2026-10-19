import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import { solesToCents } from "@/lib/money";
import type { AppError } from "@/lib/result";
import { err, ok, type Result } from "@/lib/result";
import { MANUAL_MOVEMENT_TYPES, type MovementType } from "./movement";

export type NewMovementError =
  | AppError<"InvalidType", { type: string }>
  | AppError<"InvalidAmount", { input: string }>
  | AppError<"InvalidCost", { input: string }>;

export type NewMovement = {
  type: MovementType;
  amount: Cents;
  cost: Cents | null;
  concept: string | null;
  date: ISODate;
};

/**
 * Validates a movement typed by a partner. Lends and repays never come
 * through here; loans write them.
 *
 * @param input - Type, amount and optional cost in soles, optional concept
 *   and today's date.
 * @returns The movement in cents, or `InvalidType`, `InvalidAmount` or
 *   `InvalidCost`.
 */
export function validateNewMovement(input: {
  type: string;
  amountSoles: string;
  costSoles?: string;
  concept?: string;
  today: ISODate;
}): Result<NewMovement, NewMovementError> {
  const type = MANUAL_MOVEMENT_TYPES.find((t) => t === input.type);
  if (!type) {
    return err({
      kind: "InvalidType",
      message: `type must be one of ${MANUAL_MOVEMENT_TYPES.join(", ")}`,
      type: input.type,
    });
  }

  const amount = solesToCents(input.amountSoles);
  if (amount === null || amount <= 0) {
    return err({
      kind: "InvalidAmount",
      message: "amount must be a positive number of soles",
      input: input.amountSoles,
    });
  }

  const hasCost = type === "sell_inventory" && Boolean(input.costSoles?.trim());
  const cost = hasCost ? solesToCents(input.costSoles ?? "") : null;
  if (hasCost && (cost === null || cost <= 0)) {
    return err({
      kind: "InvalidCost",
      message: "cost must be a positive number of soles when provided",
      input: input.costSoles ?? "",
    });
  }

  const concept = input.concept?.trim() || null;
  return ok({ type, amount, cost, concept, date: input.today });
}
