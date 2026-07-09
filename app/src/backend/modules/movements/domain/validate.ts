/** UC-201 input rules, pure. lend/repay never come through here (M4 writes them). */
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

  // Optional cost, only meaningful on sells (A/Gate-1 decision).
  const hasCost = type === "sell_inventory" && Boolean(input.costSoles?.trim());
  const cost = hasCost ? solesToCents(input.costSoles ?? "") : null;
  if (hasCost && (cost === null || cost <= 0)) {
    return err({
      kind: "InvalidCost",
      message: "cost must be a positive number of soles when provided",
      input: input.costSoles ?? "",
    });
  }

  const concept = input.concept?.trim() || null; // optional (A-3)
  return ok({ type, amount, cost, concept, date: input.today });
}
