/** UC-201 · Append one validated movement. Creation is append-only (A-4). */
import type { NewMovement } from "../domain/validate";
import type { LedgerMovement } from "../repositories/movement-repository";
import * as movementRepo from "../repositories/movement-repository";

export async function addMovement(
  groupId: string,
  userId: string,
  input: NewMovement,
): Promise<LedgerMovement> {
  const row = await movementRepo.insert({ groupId, userId, ...input });
  const author = await movementRepo.findAuthorName(userId);
  return { ...row, authorId: userId, authorName: author ?? "?" };
}
