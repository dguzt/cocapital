/**
 * UC-302 · Create a loan.
 *
 * One atomic write: the borrower (if new) + the `lend` movement + the loan +
 * its installments.
 *
 * The order inside the batch is load-bearing. `loans.lend_movement_id` is NOT
 * NULL, so the movement must exist before the loan that points at it — batch
 * statements run in sequence inside the one transaction. The ids are generated
 * here rather than read back, because neon-http has no interactive transaction
 * to read them back from.
 *
 * Capital effect (D3 #5): the lend moves principal only. Cash goes down,
 * "Prestado" goes up, and the total is unchanged. The expected interest never
 * enters the total — it is realised cuota by cuota, as they are collected.
 */
import { err, ok, type Result } from "@/lib/result";
import { runAtomically } from "../../../infra/db/write";
import * as movementRepo from "../../movements/repositories/movement-repository";
import type { LoanError } from "../domain/errors";
import { checkSchedule } from "../domain/invariants";
import type { NewLoan } from "../domain/loan";
import * as borrowerRepo from "../repositories/borrower-repository";
import * as installmentRepo from "../repositories/installment-repository";
import * as loanRepo from "../repositories/loan-repository";

type ResolvedBorrower =
  | { isNew: false; id: string }
  | { isNew: true; id: string; name: string; phone: string | null };

export async function createLoan(
  groupId: string,
  userId: string,
  input: NewLoan,
): Promise<Result<{ loanId: string }, LoanError>> {
  const schedule = checkSchedule(input.installments, input.capital);

  if (!schedule.ok) {
    return schedule;
  }

  const borrower = await resolveBorrower(groupId, input.borrower);

  if (!borrower.ok) {
    return borrower;
  }

  const loanId = crypto.randomUUID();
  const lendMovementId = crypto.randomUUID();

  await runAtomically([
    ...newBorrowerWrites(groupId, borrower.value),

    movementRepo.insertStmt({
      id: lendMovementId,
      groupId,
      userId,
      type: "lend",
      amount: input.capital,
      concept: null,
      date: input.startDate,
    }),

    loanRepo.insertStmt({
      id: loanId,
      groupId,
      userId,
      borrowerId: borrower.value.id,
      capital: input.capital,
      rateBps: input.rateBps,
      installmentCount: input.installments.length,
      frequency: input.frequency,
      startDate: input.startDate,
      lendMovementId,
    }),

    installmentRepo.insertManyStmt(loanId, input.installments),
  ]);

  return ok({ loanId });
}

/**
 * UC-301 · Select-or-create. An existing borrower must belong to the group —
 * that check is the authorization; a new one just needs a name.
 */
async function resolveBorrower(
  groupId: string,
  borrower: NewLoan["borrower"],
): Promise<Result<ResolvedBorrower, LoanError>> {
  if ("id" in borrower) {
    const exists = await borrowerRepo.existsInGroup(groupId, borrower.id);

    if (!exists) {
      return err({
        kind: "BorrowerNotFound",
        message: "borrower does not exist in this group",
        borrowerId: borrower.id,
      });
    }

    return ok({ isNew: false, id: borrower.id });
  }

  if (!borrower.name.trim()) {
    return err({
      kind: "BorrowerNameRequired",
      message: "new borrower needs a name",
    });
  }

  return ok({
    isNew: true,
    id: crypto.randomUUID(),
    name: borrower.name.trim(),
    phone: borrower.phone?.trim() || null,
  });
}

function newBorrowerWrites(groupId: string, borrower: ResolvedBorrower) {
  if (!borrower.isNew) {
    return [];
  }

  return [
    borrowerRepo.insertStmt({
      id: borrower.id,
      groupId,
      name: borrower.name,
      phone: borrower.phone,
    }),
  ];
}
