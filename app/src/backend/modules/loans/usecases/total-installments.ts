import type { InstallmentTotal } from "@/backend/modules/loans/domain/installment-total";
import type { InstallmentRepository } from "@/backend/modules/loans/ports/installment-repository";

export type TotalInstallmentsInput = {
  groupId: string;
};

/** Adds up what the cuotas of the group's live loans owe and paid. */
export class TotalInstallments {
  static inject = ["installments"] as const;

  constructor(private readonly installments: InstallmentRepository) {}

  /**
   * Sums the cuotas of loans that are not voided.
   *
   * @param input - The group.
   * @returns Principal and interest, one total per status.
   */
  async execute(input: TotalInstallmentsInput): Promise<InstallmentTotal[]> {
    return this.installments.totalsByGroup(input.groupId);
  }
}
