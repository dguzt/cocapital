import type { LoanError } from "@/backend/modules/loans/domain/errors";
import type { LoanDetail } from "@/backend/modules/loans/domain/loan-detail";
import type { InstallmentRepository } from "@/backend/modules/loans/ports/installment-repository";
import type { AddMovement } from "@/backend/modules/movements/usecases/add-movement";
import type { UnitOfWork } from "@/backend/shared/ports/unit-of-work";
import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";
import type { GetLoanDetail } from "./get-loan-detail";

export type CollectInstallmentInput = {
  groupId: string;
  userId: string;
  loanId: string;
  installmentId: string;
  today: ISODate;
};

type Collectable = {
  installment: LoanDetail["installments"][number];
  borrowerName: string;
};

/**
 * Collects one cuota: its full amount enters cash as a repay movement that
 * keeps the principal in `cost`, so the feed can tell interest apart.
 */
export class CollectInstallment {
  static inject = [
    "getLoanDetail",
    "installments",
    "addMovement",
    "uow",
  ] as const;

  constructor(
    private readonly getLoanDetail: GetLoanDetail,
    private readonly installments: InstallmentRepository,
    private readonly addMovement: AddMovement,
    private readonly uow: UnitOfWork,
  ) {}

  /**
   * Books the repay movement and marks the cuota collected, all or nothing.
   * When two partners collect the same cuota at once, only one succeeds.
   *
   * @param input - The group, the collecting partner, the loan, the cuota and
   *   today's date.
   * @returns The amount collected, or `LoanNotFound` or
   *   `InstallmentNotCollectable`.
   */
  async execute(
    input: CollectInstallmentInput,
  ): Promise<Result<{ amount: Cents }, LoanError>> {
    const target = await this.findCollectable(input);

    if (!target.ok) {
      return target;
    }

    const { installment, borrowerName } = target.value;

    return this.uow.run(async () => {
      const repay = await this.addMovement.execute({
        groupId: input.groupId,
        userId: input.userId,
        type: "repay",
        amount: installment.amount,
        cost: installment.principal,
        concept: `${borrowerName} · cuota ${installment.number}`,
        date: input.today,
      });

      const collected = await this.installments.markCollected(
        installment.id,
        repay.id,
        new Date(),
      );

      if (!collected) {
        return err({
          kind: "InstallmentNotCollectable",
          message: "installment was already collected",
          installmentId: installment.id,
        });
      }

      return ok({ amount: installment.amount });
    });
  }

  private async findCollectable(
    input: CollectInstallmentInput,
  ): Promise<Result<Collectable, LoanError>> {
    const loan = await this.getLoanDetail.execute({
      groupId: input.groupId,
      loanId: input.loanId,
    });

    if (!loan.ok) {
      return loan;
    }

    if (loan.value.status === "voided") {
      return err({
        kind: "InstallmentNotCollectable",
        message: "the loan is voided",
        installmentId: input.installmentId,
      });
    }

    const installment = loan.value.installments.find(
      (candidate) => candidate.id === input.installmentId,
    );

    if (!installment || installment.status !== "pending") {
      return err({
        kind: "InstallmentNotCollectable",
        message: "installment missing or already collected",
        installmentId: input.installmentId,
      });
    }

    return ok({ installment, borrowerName: loan.value.borrowerName });
  }
}
