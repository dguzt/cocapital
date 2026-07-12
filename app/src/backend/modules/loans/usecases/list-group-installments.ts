/**
 * Every installment term of the group. Feeds M5's realized-only capital:
 * pending principal is what is still "Prestado", and pending interest is only
 * "ganancia esperada" — it enters the total when the cuota is collected.
 */
import type { InstallmentRepository } from "../repositories/installment-repository";

export type ListGroupInstallmentsInput = {
  groupId: string;
};

export class ListGroupInstallments {
  static inject = ["installments"] as const;

  constructor(private readonly installments: InstallmentRepository) {}

  async execute(input: ListGroupInstallmentsInput) {
    return this.installments.listByGroup(input.groupId);
  }
}
