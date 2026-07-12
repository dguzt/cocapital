/**
 * UC-304 · Collect one installment.
 *
 * The cuota flips to collected and a `repay` movement lands in the ledger, in
 * one atomic write. Two things are load-bearing and neither is visible in the
 * code below:
 *
 * 1. The movement is written BEFORE the flip. Batch statements run in order
 *    inside the one transaction, and the installment's FK points at the
 *    movement — so it has to exist first.
 *
 * 2. `markCollectedStmt` carries a `WHERE status = 'pending'`. That guard is
 *    what makes a double collect impossible: if both partners tap "Cobrar" at
 *    once, the loser updates zero rows. Its batch still inserted a movement,
 *    though, so `writeCollection` deletes the orphan it left behind. That is
 *    the only real DELETE in the system, and it exists solely for this race.
 *
 * The repay movement stores the cuota's principal in `cost`, which is how the
 * feed can show what part of the payment was interest.
 */
import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";
import { runAtomically } from "../../../infra/db/write";
import * as movementRepo from "../../movements/repositories/movement-repository";
import type { LoanError } from "../domain/errors";
import type { LoanDetail } from "../domain/loan";
import * as installmentRepo from "../repositories/installment-repository";
import { getLoanDetail } from "./get-loan-detail";

type Collectable = {
  installment: LoanDetail["installments"][number];
  borrowerName: string;
};

export async function collectInstallment(
  groupId: string,
  userId: string,
  loanId: string,
  installmentId: string,
  today: ISODate,
): Promise<Result<{ amount: Cents }, LoanError>> {
  const target = await findCollectable(groupId, loanId, installmentId);

  if (!target.ok) {
    return target;
  }

  const written = await writeCollection(groupId, userId, target.value, today);

  if (!written.ok) {
    return written;
  }

  return ok({ amount: target.value.installment.amount });
}

/** The loan must be yours, and the cuota must exist and still be pending. */
async function findCollectable(
  groupId: string,
  loanId: string,
  installmentId: string,
): Promise<Result<Collectable, LoanError>> {
  const loan = await getLoanDetail(groupId, loanId);

  if (!loan.ok) {
    return loan;
  }

  const installment = loan.value.installments.find(
    (i) => i.id === installmentId,
  );

  if (!installment || installment.status !== "pending") {
    return err({
      kind: "InstallmentNotCollectable",
      message: "installment missing or already collected",
      installmentId,
    });
  }

  return ok({ installment, borrowerName: loan.value.borrowerName });
}

/** The repay movement and the flip, together — or neither. See the race above. */
async function writeCollection(
  groupId: string,
  userId: string,
  target: Collectable,
  today: ISODate,
): Promise<Result<true, LoanError>> {
  const { installment, borrowerName } = target;
  const repayMovementId = crypto.randomUUID();

  const [, flipped] = await runAtomically([
    movementRepo.insertStmt({
      id: repayMovementId,
      groupId,
      userId,
      type: "repay",
      amount: installment.amount,
      cost: installment.principal,
      concept: `${borrowerName} · cuota ${installment.number}`,
      date: today,
    }),
    installmentRepo.markCollectedStmt(
      installment.id,
      repayMovementId,
      new Date(),
    ),
  ]);

  if ((flipped as { id: string }[]).length === 0) {
    await movementRepo.hardDelete(repayMovementId);

    return err({
      kind: "InstallmentNotCollectable",
      message: "installment was already collected",
      installmentId: installment.id,
    });
  }

  return ok(true);
}
