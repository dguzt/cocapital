import type { LoanError } from "@/backend/modules/loans/domain/errors";
import type { NewLoan } from "@/backend/modules/loans/domain/new-loan";
import { Schedule } from "@/backend/modules/loans/domain/schedule";
import type { BorrowerRepository } from "@/backend/modules/loans/ports/borrower-repository";
import type { InstallmentRepository } from "@/backend/modules/loans/ports/installment-repository";
import type { LoanRepository } from "@/backend/modules/loans/ports/loan-repository";
import type { AddMovement } from "@/backend/modules/movements/usecases/add-movement";
import type { UnitOfWork } from "@/backend/shared/ports/unit-of-work";
import { err, ok, type Result } from "@/lib/result";

export type CreateLoanInput = NewLoan & {
  groupId: string;
  userId: string;
};

type BorrowerChoice =
  | { isNew: false; id: string }
  | { isNew: true; name: string; phone: string | null };

/**
 * Lends money to a borrower. The capital leaves cash as a lend movement and
 * counts as lent; the expected interest only enters the capital as each cuota
 * is collected.
 */
export class CreateLoan {
  static inject = [
    "loans",
    "installments",
    "borrowers",
    "addMovement",
    "uow",
  ] as const;

  constructor(
    private readonly loans: LoanRepository,
    private readonly installments: InstallmentRepository,
    private readonly borrowers: BorrowerRepository,
    private readonly addMovement: AddMovement,
    private readonly uow: UnitOfWork,
  ) {}

  /**
   * Stores the borrower when new, the lend movement, the loan and its
   * schedule, all or nothing.
   *
   * @param input - The loan as built in the wizard, its group and the
   *   partner who lends.
   * @returns The new loan's id, or why the loan is not valid.
   */
  async execute(
    input: CreateLoanInput,
  ): Promise<Result<{ loanId: string }, LoanError>> {
    const schedule = Schedule.of(input.installments, input.capital);

    if (!schedule.ok) {
      return schedule;
    }

    const borrower = await this.chooseBorrower(input.groupId, input.borrower);

    if (!borrower.ok) {
      return borrower;
    }

    return this.uow.run(async () => {
      const borrowerId = await this.borrowerIdFor(
        input.groupId,
        borrower.value,
      );

      const lend = await this.addMovement.execute({
        groupId: input.groupId,
        userId: input.userId,
        type: "lend",
        amount: input.capital,
        cost: null,
        concept: null,
        date: input.startDate,
      });

      const loanId = await this.loans.register({
        groupId: input.groupId,
        userId: input.userId,
        borrowerId,
        capital: input.capital,
        rateBps: input.rateBps,
        installmentCount: input.installments.length,
        frequency: input.frequency,
        startDate: input.startDate,
        lendMovementId: lend.id,
      });

      await this.installments.schedule(loanId, schedule.value);

      return ok({ loanId });
    });
  }

  private async chooseBorrower(
    groupId: string,
    borrower: NewLoan["borrower"],
  ): Promise<Result<BorrowerChoice, LoanError>> {
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

    const name = borrower.name.trim();

    if (!name) {
      return err({
        kind: "BorrowerNameRequired",
        message: "new borrower needs a name",
      });
    }

    return ok({
      isNew: true,
      name,
      phone: borrower.phone?.trim() || null,
    });
  }

  private async borrowerIdFor(
    groupId: string,
    borrower: BorrowerChoice,
  ): Promise<string> {
    if (!borrower.isNew) {
      return borrower.id;
    }

    return this.borrowers.register({
      groupId,
      name: borrower.name,
      phone: borrower.phone,
    });
  }
}
