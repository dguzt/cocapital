/**
 * UC-302 · Create a loan.
 *
 * One atomic write: the borrower (if new) + the `lend` movement + the loan +
 * its installments. D3 #5: the lend moves principal only — cash → Prestado,
 * total capital unchanged. Ids are generated here because neon-http has no
 * interactive transaction to read them back from.
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

export async function createLoan(
  groupId: string,
  userId: string,
  input: NewLoan,
): Promise<Result<{ loanId: string }, LoanError>> {
  const schedule = checkSchedule(input.installments, input.capital);
  if (!schedule.ok) return schedule;

  const borrower = await resolveBorrower(groupId, input.borrower);
  if (!borrower.ok) return borrower;

  const loanId = crypto.randomUUID();
  const lendMovementId = crypto.randomUUID();

  await runAtomically([
    ...(borrower.value.isNew
      ? [
          borrowerRepo.insertStmt({
            id: borrower.value.id,
            groupId,
            name: borrower.value.name,
            phone: borrower.value.phone,
          }),
        ]
      : []),
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

type ResolvedBorrower =
  | { isNew: false; id: string }
  | { isNew: true; id: string; name: string; phone: string | null };

/** Select-or-create (UC-301): an existing borrower must belong to the group. */
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
