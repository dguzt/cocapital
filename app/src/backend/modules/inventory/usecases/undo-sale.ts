/**
 * Undo a sale.
 *
 * TODAY this only voids the ledger entry — and that is honest, because
 * inventory is not an aggregate yet: there is no stock table. It is derived on
 * the fly in capital/domain/derive.ts (buys add, the cost of sells subtracts),
 * so removing the entry removes the sale completely.
 *
 * The class exists anyway, with its own name, because anular una venta is NOT
 * anular un cobro: the day stock becomes real, restocking the goods — and
 * refusing to undo a sale whose goods were already sold again — belongs HERE,
 * and nothing outside this module has to change.
 */
import type { Write } from "@/backend/infra/db/write";
import type { VoidEntry } from "@/backend/modules/movements/usecases/void-entry";

export class UndoSale {
  static inject = ["voidEntry"] as const;

  constructor(private readonly voidEntry: VoidEntry) {}

  writesFor(movementId: string): Write[] {
    return this.voidEntry.writesFor(movementId);
  }
}
