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

import type { UnitOfWork, Write } from "@/backend/infra/db/write";
import type { LoanError } from "@/backend/modules/loans/domain/errors";
import { checkSchedule } from "@/backend/modules/loans/domain/invariants";
import type { NewLoan } from "@/backend/modules/loans/domain/loan";
import type { BorrowerRepository } from "@/backend/modules/loans/repositories/borrower-repository";
import type { InstallmentRepository } from "@/backend/modules/loans/repositories/installment-repository";
import type { LoanRepository } from "@/backend/modules/loans/repositories/loan-repository";
import type { MovementRepository } from "@/backend/modules/movements/repositories/movement-repository";
import { err, ok, type Result } from "@/lib/result";

export type CreateLoanInput = NewLoan & {
  groupId: string;
  userId: string;
};

type ResolvedBorrower =
  | { isNew: false; id: string }
  | { isNew: true; id: string; name: string; phone: string | null };

export class CreateLoan {
  static inject = [
    "loans",
    "installments",
    "borrowers",
    "movements",
    "uow",
  ] as const;

  constructor(
    private readonly loans: LoanRepository,
    private readonly installments: InstallmentRepository,
    private readonly borrowers: BorrowerRepository,
    private readonly movements: MovementRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async execute(
    input: CreateLoanInput,
  ): Promise<Result<{ loanId: string }, LoanError>> {
    const schedule = checkSchedule(input.installments, input.capital);

    if (!schedule.ok) {
      return schedule;
    }

    const borrower = await this.resolveBorrower(input.groupId, input.borrower);

    if (!borrower.ok) {
      return borrower;
    }

    const loanId = crypto.randomUUID();

    await this.uow.run(this.writesFor(input, borrower.value, loanId));

    return ok({ loanId });
  }

  /**
   * UC-301 · Select-or-create. An existing borrower must belong to the group —
   * that check is the authorization; a new one just needs a name.
   */
  private async resolveBorrower(
    groupId: string,
    borrower: NewLoan["borrower"],
  ): Promise<Result<ResolvedBorrower, LoanError>> {
    if ("id" in borrower) {
      const exists = await this.borrowers.existsInGroup(groupId, borrower.id);

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

  private writesFor(
    input: CreateLoanInput,
    borrower: ResolvedBorrower,
    loanId: string,
  ): Write[] {
    const lendMovementId = crypto.randomUUID();

    const newBorrower: Write[] = borrower.isNew
      ? [
          this.borrowers.insertStmt({
            id: borrower.id,
            groupId: input.groupId,
            name: borrower.name,
            phone: borrower.phone,
          }),
        ]
      : [];

    return [
      ...newBorrower,

      this.movements.insertStmt({
        id: lendMovementId,
        groupId: input.groupId,
        userId: input.userId,
        type: "lend",
        amount: input.capital,
        concept: null,
        date: input.startDate,
      }),

      this.loans.insertStmt({
        id: loanId,
        groupId: input.groupId,
        userId: input.userId,
        borrowerId: borrower.id,
        capital: input.capital,
        rateBps: input.rateBps,
        installmentCount: input.installments.length,
        frequency: input.frequency,
        startDate: input.startDate,
        lendMovementId,
      }),

      this.installments.insertManyStmt(loanId, input.installments),
    ];
  }
}
