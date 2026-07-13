/**
 * UC-401/402 · Propose an edit or a void. Nothing is applied yet: the movement
 * keeps its old value until the OTHER partner approves (D1).
 *
 * What may be proposed depends on who owns the movement:
 *
 *   lend   → nothing. A loan's own entry is corrected from the loan.
 *   repay  → void only. Its amount belongs to the cuota, not to the movement,
 *            so editing it here would desync the two. Voiding it IS "deshacer
 *            cobro", and the loans module reverses it on approval.
 *   others → edit and void.
 *
 * The one-pending-change-per-movement rule is enforced twice: here, and by a
 * partial unique index in the schema. The index is the one that actually holds
 * under a race.
 */
import { err, ok, type Result } from "@/lib/result";
import type { PendingChangeError } from "../domain/errors";
import type { MovementSnapshot } from "../domain/movement";
import type { ChangeKind } from "../domain/pending";
import { proposeChange as decide } from "../domain/pending";
import type { ChangeRepository } from "../repositories/change-repository";
import type {
  MovementRepository,
  MovementRow,
} from "../repositories/movement-repository";

export type ProposeChangeInput = {
  groupId: string;
  actorId: string;
  movementId: string;
  kind: ChangeKind;
  after?: MovementSnapshot;
};

export class ProposeChange {
  static inject = ["movements", "changes"] as const;

  constructor(
    private readonly movements: MovementRepository,
    private readonly changes: ChangeRepository,
  ) {}

  async execute(
    input: ProposeChangeInput,
  ): Promise<Result<{ pendingId: string }, PendingChangeError>> {
    const movement = await this.movements.findInGroup(
      input.groupId,
      input.movementId,
    );

    if (!movement) {
      return err({
        kind: "MovementNotFound",
        message: "movement not found in this group",
        movementId: input.movementId,
      });
    }

    if (this.isOwnedByALoan(movement, input.kind)) {
      return err({
        kind: "SystemMovement",
        message: "loan movements are system-written; correct them via the loan",
        movementId: input.movementId,
      });
    }

    const proposal = decide({
      movement: {
        id: movement.id,
        status: movement.status,
        snapshot: this.snapshotOf(movement),
      },
      hasPendingChange: await this.changes.hasPendingFor(input.movementId),
      kind: input.kind,
      after: input.after,
      actorId: input.actorId,
    });

    if (!proposal.ok) {
      return proposal;
    }

    const row = await this.changes.insert(proposal.value);

    return ok({ pendingId: row.id });
  }

  /** A lend is untouchable here; a repay is voidable but never editable. */
  private isOwnedByALoan(movement: MovementRow, kind: ChangeKind): boolean {
    return (
      movement.type === "lend" || (movement.type === "repay" && kind === "edit")
    );
  }

  private snapshotOf(movement: MovementRow): MovementSnapshot {
    return {
      type: movement.type,
      amount: movement.amount,
      cost: movement.cost,
      concept: movement.concept,
      date: movement.date,
    };
  }
}
