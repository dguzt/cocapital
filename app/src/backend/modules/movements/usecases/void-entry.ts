/**
 * Void a plain ledger entry — an aporte or a gasto.
 *
 * These are facts that stand alone: nothing else in the system depends on them,
 * so voiding one is just the entry going quiet. A cobro or a venta is NOT this:
 * those belong to a loan / to inventory, and their owner module reverses them
 * (see application/apply-approved-change.ts).
 */
import type { Write } from "../../../infra/db/write";
import type { MovementSnapshot } from "../domain/movement";
import type { MovementRepository } from "../repositories/movement-repository";

export class VoidEntry {
  static inject = ["movements"] as const;

  constructor(private readonly movements: MovementRepository) {}

  writesFor(movementId: string): Write[] {
    return [this.movements.voidStmt(movementId)];
  }

  editWritesFor(movementId: string, snapshot: MovementSnapshot): Write[] {
    return [this.movements.applyEditStmt(movementId, snapshot)];
  }
}
