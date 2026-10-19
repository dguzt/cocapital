import type { InstallmentTerm } from "@/backend/modules/loans/domain/installment-term";
import type { InstallmentRepository } from "@/backend/modules/loans/ports/installment-repository";

export type ListGroupInstallmentsInput = {
  groupId: string;
};

/** Reads what every cuota of the group's live loans owes or paid. */
export class ListGroupInstallments {
  static inject = ["installments"] as const;

  constructor(private readonly installments: InstallmentRepository) {}

  /**
   * Lists the cuotas of loans that are not voided.
   *
   * @param input - The group.
   * @returns Principal, interest, status and due date of each cuota.
   */
  async execute(input: ListGroupInstallmentsInput): Promise<InstallmentTerm[]> {
    return this.installments.listTermsByGroup(input.groupId);
  }
}
