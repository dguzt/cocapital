/**
 * UC-305 · Undo a collection — the exact inverse of collect-installment.
 *
 * This is the use case the ledger must NOT own. Anular un cobro no es anular
 * una venta: this one has to know that a `repay` movement is the shadow of an
 * installment, and put the installment back.
 *
 * Why both writes or neither: capital is `cash + inventory + lent`, where
 * `lent` is the principal of PENDING installments. Voiding the movement alone
 * takes the cuota's cash out while its principal stays "collected" — hence out
 * of `lent` too — and the total silently shrinks by the principal. Reopening
 * the cuota in the same transaction restores it exactly: cash −amount,
 * lent +principal, interest back to expected.
 *
 * It returns writes instead of running them, so the caller can approve the
 * pending change and undo the collection in a single transaction.
 */
import type { Write } from "@/backend/infra/db/write";
import type { InstallmentRepository } from "@/backend/modules/loans/repositories/installment-repository";
import type { MovementRepository } from "@/backend/modules/movements/repositories/movement-repository";

export class UndoCollection {
  static inject = ["movements", "installments"] as const;

  constructor(
    private readonly movements: MovementRepository,
    private readonly installments: InstallmentRepository,
  ) {}

  writesFor(repayMovementId: string): Write[] {
    return [
      this.movements.voidStmt(repayMovementId),
      this.installments.reopenByRepayMovementStmt(repayMovementId),
    ];
  }
}
