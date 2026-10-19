import type { PendingChangeError } from "@/backend/modules/movements/domain/errors";
import type { MovementSnapshot } from "@/backend/modules/movements/domain/movement";
import { proposeChange as propose } from "@/backend/modules/movements/domain/pending";
import type { StoredMovement } from "@/backend/modules/movements/domain/stored-movement";
import type { ChangeRepository } from "@/backend/modules/movements/ports/change-repository";
import type { MovementRepository } from "@/backend/modules/movements/ports/movement-repository";
import { err, ok, type Result } from "@/lib/result";

export type ProposeSystemVoidInput = {
  groupId: string;
  actorId: string;
  movementId: string;
};

/**
 * Proposes a void of a movement written by another module, such as a loan's
 * lend. It goes through the same approvals inbox as any other change.
 */
export class ProposeSystemVoid {
  static inject = ["movements", "changes"] as const;

  constructor(
    private readonly movements: MovementRepository,
    private readonly changes: ChangeRepository,
  ) {}

  /**
   * Opens a pending void on the movement.
   *
   * @param input - The group, the proposing partner and the movement.
   * @returns The pending change's id, or why it cannot be proposed.
   */
  async execute(
    input: ProposeSystemVoidInput,
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

    const proposal = propose({
      movement: {
        id: movement.id,
        status: movement.status,
        snapshot: this.snapshotOf(movement),
      },
      hasPendingChange: await this.changes.hasPendingFor(input.movementId),
      kind: "void",
      actorId: input.actorId,
    });

    if (!proposal.ok) {
      return proposal;
    }

    const stored = await this.changes.propose(proposal.value);

    return ok({ pendingId: stored.id });
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
