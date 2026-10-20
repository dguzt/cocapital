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
 * until another partner approves it. Movements written by a loan or a credit
 * sale are corrected from there: a lend or sell_on_credit accepts nothing
 * here, a repay or collect_sale accepts only a void.
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

    if (this.isWrittenByAnotherModule(movement, input.kind)) {
      return err({
        kind: "SystemMovement",
        message:
          "this movement is written by a loan or a credit sale; correct it from there",
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

  private isWrittenByAnotherModule(
    movement: StoredMovement,
    kind: ChangeKind,
  ): boolean {
    switch (movement.type) {
      case "lend":
      case "sell_on_credit":
        return true;
      case "repay":
      case "collect_sale":
        return kind === "edit";
      default:
        return false;
    }
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
