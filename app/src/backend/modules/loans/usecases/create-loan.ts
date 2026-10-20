import type { ContactError } from "@/backend/modules/contacts/domain/contact-error";
import type { ResolveContact } from "@/backend/modules/contacts/usecases/resolve-contact";
import type { LoanError } from "@/backend/modules/loans/domain/errors";
import type { NewLoan } from "@/backend/modules/loans/domain/new-loan";
import { Schedule } from "@/backend/modules/loans/domain/schedule";
import type { InstallmentRepository } from "@/backend/modules/loans/ports/installment-repository";
import type { LoanRepository } from "@/backend/modules/loans/ports/loan-repository";
import type { AddMovement } from "@/backend/modules/movements/usecases/add-movement";
import type { UnitOfWork } from "@/backend/shared/ports/unit-of-work";
import { ok, type Result } from "@/lib/result";

export type CreateLoanInput = NewLoan & {
  groupId: string;
  userId: string;
};

/**
 * Lends money to a contact. The capital leaves cash as a lend movement and
 * counts as lent; the expected interest only enters the capital as each cuota
 * is collected.
 */
export class CreateLoan {
  static inject = [
    "loans",
    "installments",
    "resolveContact",
    "addMovement",
    "uow",
  ] as const;

  constructor(
    private readonly loans: LoanRepository,
    private readonly installments: InstallmentRepository,
    private readonly resolveContact: ResolveContact,
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
  ): Promise<Result<{ loanId: string }, LoanError | ContactError>> {
    const schedule = Schedule.of(input.installments, input.capital);

    if (!schedule.ok) {
      return schedule;
    }

    return this.uow.run<{ loanId: string }, LoanError | ContactError>(
      async () => {
        const borrower = await this.resolveContact.execute({
          groupId: input.groupId,
          choice: input.borrower,
        });

        if (!borrower.ok) {
          return borrower;
        }

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
          borrowerId: borrower.value.contactId,
          capital: input.capital,
          rateBps: input.rateBps,
          installmentCount: input.installments.length,
          frequency: input.frequency,
          startDate: input.startDate,
          lendMovementId: lend.id,
        });

        await this.installments.schedule(loanId, schedule.value);

        return ok({ loanId });
      },
    );
  }
}
