import { ChangeProposal } from "@/backend/modules/movements/domain/change-proposal";
import type { PendingChangeError } from "@/backend/modules/movements/domain/errors";
import type { MovementSnapshot } from "@/backend/modules/movements/domain/movement";
import type { StoredMovement } from "@/backend/modules/movements/domain/stored-movement";
import type { ChangeRepository } from "@/backend/modules/movements/ports/change-repository";
import type { MovementRepository } from "@/backend/modules/movements/ports/movement-repository";
import type {
  SubmitChange,
  SubmittedChange,
} from "@/backend/modules/movements/usecases/submit-change";
import { err, type Result } from "@/lib/result";

export type ProposeSystemVoidInput = {
  groupId: string;
  actorId: string;
  movementId: string;
  alone: boolean;
};

/**
 * Proposes a void of a movement written by another module, such as a loan's
 * lend. It goes through the same approvals inbox as any other change.
 */
export class ProposeSystemVoid {
  static inject = ["movements", "changes", "submitChange"] as const;

  constructor(
    private readonly movements: MovementRepository,
    private readonly changes: ChangeRepository,
    private readonly submitChange: SubmitChange,
  ) {}

  /**
   * Opens a pending void on the movement.
   *
   * @param input - The group, the proposing partner, the movement and whether
   *   the partner is alone in the group.
   * @returns The change's id and whether it was applied at once, or why
   *   it cannot be proposed.
   */
  async execute(
    input: ProposeSystemVoidInput,
  ): Promise<Result<SubmittedChange, PendingChangeError>> {
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

    const proposal = ChangeProposal.propose({
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

    return this.submitChange.execute({
      proposal: proposal.value,
      movementType: movement.type,
      alone: input.alone,
    });
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
