/** UC-301 · The group's reusable borrowers, for select-or-create. */
import type { BorrowerRepository } from "@/backend/modules/loans/repositories/borrower-repository";

export type ListBorrowersInput = {
  groupId: string;
};

export class ListBorrowers {
  static inject = ["borrowers"] as const;

  constructor(private readonly borrowers: BorrowerRepository) {}

  async execute(input: ListBorrowersInput) {
    return this.borrowers.listByGroup(input.groupId);
  }
}
