import type { LoanEntry } from "@/backend/modules/loans/domain/loan-entry";
import type { LoanHeader } from "@/backend/modules/loans/domain/loan-header";
import type { LoanListItem } from "@/backend/modules/loans/domain/loan-list-item";
import type { ISODate } from "@/lib/dates";

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
   * Lists the group's loans with their cuotas counted and added up.
   *
   * @param groupId - The group.
   * @param today - Today's date in Lima, to count overdue cuotas.
   * @returns One item per loan, newest first.
   */
  listItems(groupId: string, today: ISODate): Promise<LoanListItem[]>;

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

  /**
   * Holds the loan until the unit of work ends, so no one collects or voids it meanwhile.
   *
   * @param loanId - The loan.
   * @returns Its status, or null when it does not exist.
   */
  lock(loanId: string): Promise<"active" | "voided" | null>;
}
