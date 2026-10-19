import type { Borrower } from "@/backend/modules/loans/domain/borrower";
import type { BorrowerEntry } from "@/backend/modules/loans/domain/borrower-entry";

/** Storage of the people a group lends to. */
export interface BorrowerRepository {
  /**
   * Lists a group's borrowers.
   *
   * @param groupId - The group.
   * @returns Its borrowers, by name.
   */
  listByGroup(groupId: string): Promise<Borrower[]>;

  /**
   * Tells whether a borrower belongs to the group.
   *
   * @param groupId - The group asking.
   * @param borrowerId - The borrower.
   * @returns True when the borrower is the group's.
   */
  existsInGroup(groupId: string, borrowerId: string): Promise<boolean>;

  /**
   * Adds a borrower to a group.
   *
   * @param entry - The group, name and phone.
   * @returns The new borrower's id.
   */
  register(entry: BorrowerEntry): Promise<string>;
}
