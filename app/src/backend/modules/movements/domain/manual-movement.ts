import type { ISODate } from "@/lib/dates";
import { type Cents, solesToCents } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";
import { MANUAL_MOVEMENT_TYPES, type MovementType } from "./movement";
import type { NewMovement } from "./new-movement";
import type { NewMovementError } from "./new-movement-error";

/**
 * A movement a partner types in the "Nuevo movimiento" sheet. Lends and
 * repays never come through here; loans write them.
 */
export class ManualMovement implements NewMovement {
  private constructor(
    readonly type: MovementType,
    readonly amount: Cents,
    readonly cost: Cents | null,
    readonly concept: string | null,
    readonly date: ISODate,
  ) {}

  /**
   * Reads the form, amounts in soles. A cost only counts on a sale.
   *
   * @param form - Type, amount, optional cost and concept, and today's date.
   * @returns The movement in cents, or `InvalidType`, `InvalidAmount` or
   *   `InvalidCost`.
   */
  static parse(form: {
    type: string;
    amountSoles: string;
    costSoles?: string;
    concept?: string;
    today: ISODate;
  }): Result<ManualMovement, NewMovementError> {
    const type = MANUAL_MOVEMENT_TYPES.find((known) => known === form.type);

    if (!type) {
      return err({
        kind: "InvalidType",
        message: `type must be one of ${MANUAL_MOVEMENT_TYPES.join(", ")}`,
        type: form.type,
      });
    }

    const amount = solesToCents(form.amountSoles);

    if (amount === null || amount <= 0) {
      return err({
        kind: "InvalidAmount",
        message: "amount must be a positive number of soles",
        input: form.amountSoles,
      });
    }

    const hasCost =
      type === "sell_inventory" && Boolean(form.costSoles?.trim());

    const cost = hasCost ? solesToCents(form.costSoles ?? "") : null;

    if (hasCost && (cost === null || cost <= 0)) {
      return err({
        kind: "InvalidCost",
        message: "cost must be a positive number of soles when provided",
        input: form.costSoles ?? "",
      });
    }

    return ok(
      new ManualMovement(
        type,
        amount,
        cost,
        form.concept?.trim() || null,
        form.today,
      ),
    );
  }
}
