import type { Borrower } from "@/backend/modules/loans/domain/borrower";
import type { BorrowerRepository } from "@/backend/modules/loans/ports/borrower-repository";

export type ListBorrowersInput = {
  groupId: string;
};

/** Reads the borrowers a group can lend to again. */
export class ListBorrowers {
  static inject = ["borrowers"] as const;

  constructor(private readonly borrowers: BorrowerRepository) {}

  /**
   * Lists the borrowers.
   *
   * @param input - The group.
   * @returns Its borrowers, by name.
   */
  async execute(input: ListBorrowersInput): Promise<Borrower[]> {
    return this.borrowers.listByGroup(input.groupId);
  }
}
