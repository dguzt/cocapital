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
 *    though, so we delete the orphan it left behind. That is the only real
 *    DELETE in the system, and it exists solely for this race.
 *
 * The repay movement stores the cuota's principal in `cost`, which is how the
 * feed can show what part of the payment was interest.
 */
import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";
import type { UnitOfWork } from "../../../infra/db/write";
import type { MovementRepository } from "../../movements/repositories/movement-repository";
import type { LoanError } from "../domain/errors";
import type { LoanDetail } from "../domain/loan";
import type { InstallmentRepository } from "../repositories/installment-repository";
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

export class CollectInstallment {
  static inject = [
    "getLoanDetail",
    "installments",
    "movements",
    "uow",
  ] as const;

  constructor(
    private readonly getLoanDetail: GetLoanDetail,
    private readonly installments: InstallmentRepository,
    private readonly movements: MovementRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async execute(
    input: CollectInstallmentInput,
  ): Promise<Result<{ amount: Cents }, LoanError>> {
    const target = await this.findCollectable(input);

    if (!target.ok) {
      return target;
    }

    const written = await this.writeCollection(input, target.value);

    if (!written.ok) {
      return written;
    }

    return ok({ amount: target.value.installment.amount });
  }

  /** The loan must be yours, and the cuota must exist and still be pending. */
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
      (i) => i.id === input.installmentId,
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

  /** The repay movement and the flip, together — or neither. */
  private async writeCollection(
    input: CollectInstallmentInput,
    target: Collectable,
  ): Promise<Result<true, LoanError>> {
    const { installment, borrowerName } = target;
    const repayMovementId = crypto.randomUUID();

    const [, flipped] = await this.uow.run([
      this.movements.insertStmt({
        id: repayMovementId,
        groupId: input.groupId,
        userId: input.userId,
        type: "repay",
        amount: installment.amount,
        cost: installment.principal,
        concept: `${borrowerName} · cuota ${installment.number}`,
        date: input.today,
      }),
      this.installments.markCollectedStmt(
        installment.id,
        repayMovementId,
        new Date(),
      ),
    ]);

    if ((flipped as { id: string }[]).length === 0) {
      await this.movements.hardDelete(repayMovementId);

      return err({
        kind: "InstallmentNotCollectable",
        message: "installment was already collected",
        installmentId: installment.id,
      });
    }

    return ok(true);
  }
}
