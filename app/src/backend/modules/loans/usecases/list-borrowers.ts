/** UC-301 · The group's reusable borrowers, for select-or-create. */
import * as borrowerRepo from "../repositories/borrower-repository";

export async function listBorrowers(groupId: string) {
  return borrowerRepo.listByGroup(groupId);
}
