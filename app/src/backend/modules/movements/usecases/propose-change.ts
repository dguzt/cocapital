import type { ChangeKind } from "@/backend/modules/movements/domain/change-kind";
import { ChangeProposal } from "@/backend/modules/movements/domain/change-proposal";
import type { PendingChangeError } from "@/backend/modules/movements/domain/errors";
import type { MovementSnapshot } from "@/backend/modules/movements/domain/movement";
import type { StoredMovement } from "@/backend/modules/movements/domain/stored-movement";
import type { ChangeRepository } from "@/backend/modules/movements/ports/change-repository";
import type { MovementRepository } from "@/backend/modules/movements/ports/movement-repository";
import { err, ok, type Result } from "@/lib/result";

export type ProposeChangeInput = {
  groupId: string;
  actorId: string;
  movementId: string;
  kind: ChangeKind;
  after?: MovementSnapshot;
};

/**
 * Proposes an edit or a void of a movement from the ledger. Nothing changes
 * until another partner approves it. A loan's own movements are corrected
 * from the loan: a lend accepts nothing here, a repay accepts only a void.
 */
export class ProposeChange {
  static inject = ["movements", "changes"] as const;

  constructor(
    private readonly movements: MovementRepository,
    private readonly changes: ChangeRepository,
  ) {}

  /**
   * Opens a pending change on the movement.
   *
   * @param input - The group, the proposing partner, the movement, the kind of
   *   change and, for an edit, the proposed values.
   * @returns The pending change's id, or why it cannot be proposed.
   */
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

    const proposal = ChangeProposal.propose({
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

    const stored = await this.changes.propose(proposal.value);

    return ok({ pendingId: stored.id });
  }

  private isOwnedByALoan(movement: StoredMovement, kind: ChangeKind): boolean {
    return (
      movement.type === "lend" || (movement.type === "repay" && kind === "edit")
    );
  }

  private snapshotOf(movement: StoredMovement): MovementSnapshot {
    return {
      type: movement.type,
      amount: movement.amount,
      cost: movement.cost,
      concept: movement.concept,
      date: movement.date,
    };
  }
}
