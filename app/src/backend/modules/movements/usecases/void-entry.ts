/**
 * Void a plain ledger entry — an aporte or a gasto.
 *
 * These are facts that stand alone: nothing else in the system depends on
 * them, so voiding one is just the entry going quiet. A cobro or a venta is
 * NOT this: those belong to a loan / to inventory, and their owner module
 * reverses them (see application/apply-approved-change.ts).
 */
import type { Write } from "../../../infra/db/write";
import type { MovementSnapshot } from "../domain/movement";
import * as movementRepo from "../repositories/movement-repository";

export function voidEntryWrites(movementId: string): Write[] {
  return [movementRepo.voidStmt(movementId)];
}

export function applyEditWrites(
  movementId: string,
  snapshot: MovementSnapshot,
): Write[] {
  return [movementRepo.applyEditStmt(movementId, snapshot)];
}
