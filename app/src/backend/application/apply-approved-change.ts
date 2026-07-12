/**
 * The composition root — the ONLY file allowed to know every module.
 *
 * A change was approved. Who executes it? Its owner. "Movimiento" is how the
 * ledger SHOWS these facts, not how they behave: anular un cobro reabre una
 * cuota (loans), anular una venta repondrá stock (inventory), anular un aporte
 * no toca nada más (ledger). Wiring that here is what keeps the ledger from
 * growing an `if` per module.
 *
 * The switch is exhaustive on purpose: add a movement type and this stops
 * compiling until you say who reverses it. The question "and who undoes this?"
 * is no longer something anyone can forget — the compiler asks it.
 */
import type { Write } from "../infra/db/write";
import { undoPurchaseWrites } from "../modules/inventory/usecases/undo-purchase";
import { undoSaleWrites } from "../modules/inventory/usecases/undo-sale";
import { undoCollectionWrites } from "../modules/loans/usecases/undo-collection";
import type { ApprovedChange } from "../modules/movements/usecases/decide-change";
import {
  applyEditWrites,
  voidEntryWrites,
} from "../modules/movements/usecases/void-entry";

export function applyApprovedChange(change: ApprovedChange): Write[] {
  if (change.kind === "edit") {
    // Only the plain ledger types are editable — propose-change refuses the
    // rest, so anything reaching here edits its own row and nothing else.
    return applyEditWrites(change.movementId, change.after);
  }

  switch (change.movementType) {
    case "repay":
      return undoCollectionWrites(change.movementId);
    case "sell_inventory":
      return undoSaleWrites(change.movementId);
    case "buy_inventory":
      return undoPurchaseWrites(change.movementId);
    case "contribute":
    case "expense":
      return voidEntryWrites(change.movementId);
    case "lend":
      // Unreachable: propose-change rejects it. Voiding a loan's entry IS
      // voiding the loan — that reverses every collection too, and it will be
      // loans/usecases/void-loan.ts, not a ledger void.
      throw new Error("a loan is voided from the loan, not from its movement");
  }
}
