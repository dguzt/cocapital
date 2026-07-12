/**
 * UC-401/402 · Propose an edit or a void. Nothing is applied yet: the movement
 * keeps its old value until the OTHER partner approves (D1).
 *
 * What may be proposed depends on who owns the movement:
 *   · lend  → nothing. The loan's own entry is corrected from the loan.
 *   · repay → void only. Its amount belongs to the cuota, not to the movement,
 *             so editing it here would desync the two. Voiding it is
 *             "deshacer cobro" and the loans module reverses it on approval.
 *   · the rest → edit and void.
 */
import { err, ok, type Result } from "@/lib/result";
import type { PendingChangeError } from "../domain/errors";
import type { MovementSnapshot } from "../domain/movement";
import type { ChangeKind } from "../domain/pending";
import { proposeChange as decide } from "../domain/pending";
import * as changeRepo from "../repositories/change-repository";
import * as movementRepo from "../repositories/movement-repository";

export async function proposeChange(
  groupId: string,
  actorId: string,
  movementId: string,
  kind: ChangeKind,
  after?: MovementSnapshot,
): Promise<Result<{ pendingId: string }, PendingChangeError>> {
  const movement = await movementRepo.findInGroup(groupId, movementId);
  if (!movement) {
    return err({
      kind: "MovementNotFound",
      message: "movement not found in this group",
      movementId,
    });
  }

  if (
    movement.type === "lend" ||
    (movement.type === "repay" && kind === "edit")
  ) {
    return err({
      kind: "SystemMovement",
      message: "loan movements are system-written; correct them via the loan",
      movementId,
    });
  }

  const proposal = decide({
    movement: {
      id: movement.id,
      status: movement.status,
      snapshot: {
        type: movement.type,
        amount: movement.amount,
        cost: movement.cost,
        concept: movement.concept,
        date: movement.date,
      },
    },
    hasPendingChange: await changeRepo.hasPendingFor(movementId),
    kind,
    after,
    actorId,
  });
  if (!proposal.ok) return proposal;

  const row = await changeRepo.insert(proposal.value);
  return ok({ pendingId: row.id });
}
