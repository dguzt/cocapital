/**
 * UC-304 · Collect one installment.
 *
 * The cuota flips to collected and a `repay` movement lands in the ledger, in
 * one atomic write. The flip carries a WHERE status='pending' guard, so two
 * partners tapping "Cobrar" at once cannot collect the same cuota twice: the
 * loser updates zero rows and we clean up the movement it orphaned.
 */
import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";
import { runAtomically } from "../../../infra/db/write";
import * as movementRepo from "../../movements/repositories/movement-repository";
import type { LoanError } from "../domain/errors";
import * as installmentRepo from "../repositories/installment-repository";
import { getLoanDetail } from "./get-loan-detail";

export async function collectInstallment(
  groupId: string,
  userId: string,
  loanId: string,
  installmentId: string,
  today: ISODate,
): Promise<Result<{ amount: Cents }, LoanError>> {
  const loan = await getLoanDetail(groupId, loanId);
  if (!loan.ok) return loan;

  const inst = loan.value.installments.find((i) => i.id === installmentId);
  if (!inst || inst.status !== "pending") {
    return err({
      kind: "InstallmentNotCollectable",
      message: "installment missing or already collected",
      installmentId,
    });
  }

  const repayMovementId = crypto.randomUUID();
  // Order matters: the movement must exist before the installment's FK points
  // at it — batch statements run sequentially inside the one transaction.
  const [, flipped] = await runAtomically([
    movementRepo.insertStmt({
      id: repayMovementId,
      groupId,
      userId,
      type: "repay",
      amount: inst.amount,
      cost: inst.principal, // principal share → the feed can show "Interés S/x"
      concept: `${loan.value.borrowerName} · cuota ${inst.number}`,
      date: today,
    }),
    installmentRepo.markCollectedStmt(
      installmentId,
      repayMovementId,
      new Date(),
    ),
  ]);

  if ((flipped as { id: string }[]).length === 0) {
    // Someone collected between our read and our write. The batch still ran,
    // so remove the repay movement it left behind.
    await movementRepo.hardDelete(repayMovementId);
    return err({
      kind: "InstallmentNotCollectable",
      message: "installment was already collected",
      installmentId,
    });
  }

  return ok({ amount: inst.amount });
}
