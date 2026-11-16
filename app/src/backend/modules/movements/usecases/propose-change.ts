import type { ChangeKind } from "@/backend/modules/movements/domain/change-kind";
import { ChangeProposal } from "@/backend/modules/movements/domain/change-proposal";
import type { PendingChangeError } from "@/backend/modules/movements/domain/errors";
import type { MovementSnapshot } from "@/backend/modules/movements/domain/movement";
import type { MovementEdit } from "@/backend/modules/movements/domain/movement-edit";
import type { StoredMovement } from "@/backend/modules/movements/domain/stored-movement";
import type { ChangeRepository } from "@/backend/modules/movements/ports/change-repository";
import type { MovementRepository } from "@/backend/modules/movements/ports/movement-repository";
import type {
  SubmitChange,
  SubmittedChange,
} from "@/backend/modules/movements/usecases/submit-change";
import { err, type Result } from "@/lib/result";

export type ProposeChangeInput = {
  groupId: string;
  actorId: string;
  movementId: string;
  alone: boolean;
  kind: ChangeKind;
  edit?: MovementEdit;
};

/**
 * Proposes an edit or a void of a movement from the ledger. Nothing changes
 * until another partner approves it, unless the partner is alone. Movements
 * written by a loan or a credit sale are corrected from there: a lend or
 * sell_on_credit accepts nothing here, a repay or collect_sale accepts only a
 * void.
 */
export class ProposeChange {
  static inject = ["movements", "changes", "submitChange"] as const;

  constructor(
    private readonly movements: MovementRepository,
    private readonly changes: ChangeRepository,
    private readonly submitChange: SubmitChange,
  ) {}

  /**
   * Opens a pending change on the movement.
   *
   * @param input - The group, the proposing partner, the movement, the kind of
   *   change, for an edit what it changes, and whether the partner is alone
   *   in the group.
   * @returns The change's id and whether it was applied at once, or why
   *   it cannot be proposed.
   */
  async execute(
    input: ProposeChangeInput,
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
      edit: input.edit,
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
