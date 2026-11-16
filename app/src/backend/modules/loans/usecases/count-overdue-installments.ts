import type { InstallmentRepository } from "@/backend/modules/loans/ports/installment-repository";
import type { ISODate } from "@/lib/dates";

export type CountOverdueInstallmentsInput = {
  groupId: string;
  today: ISODate;
};

/** Counts the cuotas of the group's live loans that fell due unpaid. */
export class CountOverdueInstallments {
  static inject = ["installments"] as const;

  constructor(private readonly installments: InstallmentRepository) {}

  /**
   * Counts the pending cuotas due before today.
   *
   * @param input - The group and today's date in Lima.
   * @returns How many cuotas are overdue.
   */
  async execute(input: CountOverdueInstallmentsInput): Promise<number> {
    return this.installments.countOverdue(input.groupId, input.today);
  }
}
