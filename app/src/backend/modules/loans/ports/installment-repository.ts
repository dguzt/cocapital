import type { Installment } from "@/backend/modules/loans/domain/installment";
import type { InstallmentTotal } from "@/backend/modules/loans/domain/installment-total";
import type { Schedule } from "@/backend/modules/loans/domain/schedule";
import type { ISODate } from "@/lib/dates";

/** Storage of the cuotas of every loan. */
export interface InstallmentRepository {
  /**
   * Lists a loan's cuotas.
   *
   * @param loanId - The loan.
   * @returns Its cuotas, in order.
   */
  listByLoan(loanId: string): Promise<Installment[]>;

  /**
   * Adds up the cuotas of a group's loans that are not voided.
   *
   * @param groupId - The group.
   * @returns Principal and interest, one total per status.
   */
  totalsByGroup(groupId: string): Promise<InstallmentTotal[]>;

  /**
   * Counts the pending cuotas of a group's live loans due before today.
   *
   * @param groupId - The group.
   * @param today - Today's date in Lima.
   * @returns How many are overdue.
   */
  countOverdue(groupId: string, today: ISODate): Promise<number>;

  /**
   * Lists the repay movements of a loan's collected cuotas.
   *
   * @param loanId - The loan.
   * @returns The repay movement ids.
   */
  repayMovementIdsOf(loanId: string): Promise<string[]>;

  /**
   * Finds the cuota a repay movement collected, only within the group.
   *
   * @param groupId - The group asking.
   * @param repayMovementId - The repay movement.
   * @returns The loan and the cuota, or null.
   */
  findByRepayMovement(
    groupId: string,
    repayMovementId: string,
  ): Promise<{ loanId: string; installmentId: string } | null>;

  /**
   * Stores a loan's schedule.
   *
   * @param loanId - The loan.
   * @param schedule - Its cuotas.
   */
  schedule(loanId: string, schedule: Schedule): Promise<void>;

  /**
   * Marks a cuota collected, only if it is still pending.
   *
   * @param installmentId - The cuota.
   * @param repayMovementId - The repay movement that booked the payment.
   * @param collectedAt - When it was collected.
   * @returns True when the cuota was pending and is now collected; false when
   *   someone collected it first.
   */
  markCollected(
    installmentId: string,
    repayMovementId: string,
    collectedAt: Date,
  ): Promise<boolean>;

  /**
   * Puts a collected cuota back to pending.
   *
   * @param repayMovementId - The repay movement of its collection.
   */
  reopenByRepayMovement(repayMovementId: string): Promise<void>;
}
