import { err, ok, type Result } from "@/lib/result";
import type { ChangeKind } from "./change-kind";
import type { PendingChangeError } from "./errors";
import type { MovementSnapshot, MovementStatus } from "./movement";

/**
 * A partner's request to edit or void a movement. Nothing changes until
 * another partner approves it.
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
   *   has a change waiting for an OK, the kind of change, the new values for
   *   an edit, and who proposes it.
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
    after?: MovementSnapshot;
    actorId: string;
  }): Result<ChangeProposal, PendingChangeError> {
    const { movement, hasPendingChange, kind, after, actorId } = input;

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

    if (kind === "edit" && !after) {
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
        kind === "edit" ? (after ?? null) : null,
      ),
    );
  }
}
