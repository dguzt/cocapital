/**
 * Every installment term of the group. Feeds M5's realized-only capital:
 * pending principal is what's still "Prestado", pending interest is only
 * "ganancia esperada" — it enters the total when the cuota is collected.
 */
import * as installmentRepo from "../repositories/installment-repository";

export async function listGroupInstallments(groupId: string) {
  return installmentRepo.listByGroup(groupId);
}
