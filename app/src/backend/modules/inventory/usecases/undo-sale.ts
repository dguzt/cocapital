/**
 * Undo a sale.
 *
 * TODAY this only voids the ledger entry — and that is honest, because
 * inventory is not an aggregate yet: there is no stock table. It's derived on
 * the fly in capital/domain/derive.ts (buys add, the cost of sells subtracts),
 * so removing the entry removes the sale completely.
 *
 * The file exists anyway, with its own name, because anular una venta is NOT
 * anular un cobro: the day stock becomes real, restocking the goods — and
 * refusing to undo a sale whose goods were already sold again — belongs HERE,
 * and nothing outside this module has to change.
 */
import type { Write } from "../../../infra/db/write";
import { voidEntryWrites } from "../../movements/usecases/void-entry";

export function undoSaleWrites(movementId: string): Write[] {
  return voidEntryWrites(movementId);
}
