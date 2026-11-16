import { err, ok, type Result } from "@/lib/result";
import type { ApprovedChange } from "./approved-change";
import type { ChangeKind } from "./change-kind";
import type { PendingChangeError } from "./errors";
import type {
  MovementSnapshot,
  MovementStatus,
  MovementType,
} from "./movement";
import type { MovementEdit } from "./movement-edit";

/**
 * A partner's request to edit or void a movement. Nothing changes until
 * another partner approves it, unless the partner runs the group alone.
 */
export class ChangeProposal {
  private constructor(
    readonly movementId: string,
    readonly kind: ChangeKind,
    readonly proposedBy: string,
    readonly before: MovementSnapshot,
    readonly after: MovementSnapshot | null,
  ) {}

  /**
   * Proposes a change, if the movement can still take one.
   *
   * @param input - The movement and its current values, whether it already
   *   has a change waiting for an OK, the kind of change, what an edit
   *   changes, and who proposes it.
   * @returns The proposal, or `MovementVoided`, `ChangeAlreadyPending` or
   *   `MissingChanges`.
   */
  static propose(input: {
    movement: {
      id: string;
      status: MovementStatus;
      snapshot: MovementSnapshot;
    };
    hasPendingChange: boolean;
    kind: ChangeKind;
    edit?: MovementEdit;
    actorId: string;
  }): Result<ChangeProposal, PendingChangeError> {
    const { movement, hasPendingChange, kind, edit, actorId } = input;

    if (movement.status === "voided") {
      return err({
        kind: "MovementVoided",
        message: "cannot modify a voided movement",
        movementId: movement.id,
      });
    }

    if (hasPendingChange) {
      return err({
        kind: "ChangeAlreadyPending",
        message: "this movement already has a change awaiting approval",
        movementId: movement.id,
      });
    }

    if (kind === "edit" && !edit) {
      return err({
        kind: "MissingChanges",
        message: "an edit must include the new values",
        movementId: movement.id,
      });
    }

    return ok(
      new ChangeProposal(
        movement.id,
        kind,
        actorId,
        movement.snapshot,
        kind === "edit" && edit
          ? ChangeProposal.edited(movement.snapshot, edit)
          : null,
      ),
    );
  }

  private static edited(
    before: MovementSnapshot,
    edit: MovementEdit,
  ): MovementSnapshot {
    return {
      ...before,
      amount: edit.amount,
      concept: edit.concept,
      cost: before.type === "sell_inventory" ? edit.cost : before.cost,
    };
  }

  /**
   * Turns the proposal into a change ready to apply, for a partner who runs
   * the group alone and has nobody to ask for an OK.
   *
   * @param movementType - The type of the movement it targets.
   * @returns The edit or void its owner must apply.
   */
  approvedAlone(movementType: MovementType): ApprovedChange {
    if (this.kind === "edit" && this.after) {
      return {
        kind: "edit",
        movementId: this.movementId,
        movementType,
        after: this.after,
      };
    }

    return {
      kind: "void",
      movementId: this.movementId,
      movementType,
    };
  }
}
