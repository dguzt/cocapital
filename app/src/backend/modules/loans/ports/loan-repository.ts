import type { LoanEntry } from "@/backend/modules/loans/domain/loan-entry";
import type { LoanHeader } from "@/backend/modules/loans/domain/loan-header";
import type { LoanScheduleRow } from "@/backend/modules/loans/domain/loan-schedule-row";

/** Storage of loans. */
export interface LoanRepository {
  /**
   * Finds a loan, only if it belongs to the group.
   *
   * @param groupId - The group asking.
   * @param loanId - The loan.
   * @returns The loan with its borrower's name, or null.
   */
  findInGroup(groupId: string, loanId: string): Promise<LoanHeader | null>;

  /**
   * Finds the loan a lend movement booked.
   *
   * @param lendMovementId - The lend movement.
   * @param groupId - When given, only a loan of this group is found.
   * @returns The loan's id, or null.
   */
  idByLendMovement(
    lendMovementId: string,
    groupId?: string,
  ): Promise<string | null>;

  /**
   * Lists every cuota of every loan of the group.
   *
   * @param groupId - The group.
   * @returns One row per cuota, newest loan first.
   */
  listSchedules(groupId: string): Promise<LoanScheduleRow[]>;

  /**
   * Stores a new loan.
   *
   * @param entry - The loan and the lend movement that booked it.
   * @returns The new loan's id.
   */
  register(entry: LoanEntry): Promise<string>;

  /**
   * Marks a loan voided, so its cuotas stop counting as lent.
   *
   * @param loanId - The loan.
   */
  void(loanId: string): Promise<void>;
}
