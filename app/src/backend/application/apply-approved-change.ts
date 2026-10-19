import type { UndoPurchase } from "@/backend/modules/inventory/usecases/undo-purchase";
import type { UndoSale } from "@/backend/modules/inventory/usecases/undo-sale";
import type { UndoCollection } from "@/backend/modules/loans/usecases/undo-collection";
import type { VoidLoan } from "@/backend/modules/loans/usecases/void-loan";
import type { ApprovedChange } from "@/backend/modules/movements/domain/approved-change";
import type { ChangeApplier } from "@/backend/modules/movements/ports/change-applier";
import type { EditEntry } from "@/backend/modules/movements/usecases/edit-entry";
import type { VoidEntry } from "@/backend/modules/movements/usecases/void-entry";

/**
 * Hands each approved change to the module that owns its movement: a repay to
 * loans, a sale or purchase to inventory, an aporte or gasto to the ledger.
 * Every movement type must name its owner here or this stops compiling.
 */
export class ApplyApprovedChange implements ChangeApplier {
  static inject = [
    "undoCollection",
    "undoSale",
    "undoPurchase",
    "voidEntry",
    "editEntry",
    "voidLoan",
  ] as const;

  constructor(
    private readonly undoCollection: UndoCollection,
    private readonly undoSale: UndoSale,
    private readonly undoPurchase: UndoPurchase,
    private readonly voidEntry: VoidEntry,
    private readonly editEntry: EditEntry,
    private readonly voidLoan: VoidLoan,
  ) {}

  /**
   * Applies the change through its owner.
   *
   * @param change - The approved edit or void.
   */
  async apply(change: ApprovedChange): Promise<void> {
    if (change.kind === "edit") {
      return this.editEntry.execute({
        movementId: change.movementId,
        after: change.after,
      });
    }

    switch (change.movementType) {
      case "repay":
        return this.undoCollection.execute({
          repayMovementId: change.movementId,
        });
      case "sell_inventory":
        return this.undoSale.execute({ movementId: change.movementId });
      case "buy_inventory":
        return this.undoPurchase.execute({ movementId: change.movementId });
      case "contribute":
      case "expense":
        return this.voidEntry.execute({ movementId: change.movementId });
      case "lend":
        return this.voidLoan.execute({ lendMovementId: change.movementId });
    }
  }
}
