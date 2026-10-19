import { err, ok, type Result } from "@/lib/result";
import type { PendingChangeError } from "./errors";
import type { MovementSnapshot, MovementStatus } from "./movement";

export type ChangeKind = "edit" | "void";
export type PendingStatus = "pending" | "approved" | "rejected";

export type ProposeInput = {
  movement: { id: string; status: MovementStatus; snapshot: MovementSnapshot };
  /** Whether the movement already has a change waiting for an OK. */
  hasPendingChange: boolean;
  kind: ChangeKind;
  /** Required for edit; ignored for void. */
  after?: MovementSnapshot;
  actorId: string;
};

/** A change ready to be stored, with the movement as it was before. */
export type ProposedChange = {
  movementId: string;
  kind: ChangeKind;
  proposedBy: string;
  before: MovementSnapshot;
  after: MovementSnapshot | null;
};

/**
 * Decides whether a change can be proposed on a movement.
 *
 * @param input - The movement, whether it already has a pending change, the
 *   kind of change, the new values for an edit and who proposes it.
 * @returns The change to store, or `MovementVoided`, `ChangeAlreadyPending`
 *   or `MissingChanges`.
 */
export function proposeChange(
  input: ProposeInput,
): Result<ProposedChange, PendingChangeError> {
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

  return ok({
    movementId: movement.id,
    kind,
    proposedBy: actorId,
    before: movement.snapshot,
    after: kind === "edit" ? (after ?? null) : null,
  });
}

export type DecideInput = {
  pending: {
    id: string;
    status: PendingStatus;
    proposedBy: string;
    kind: ChangeKind;
    after: MovementSnapshot | null;
  };
  decision: "approve" | "reject";
  actorId: string;
};

/** What a decision does: nothing more when rejected, the change when approved. */
export type DecisionOutcome =
  | { apply: false; pendingStatus: "rejected" }
  | {
      apply: true;
      pendingStatus: "approved";
      action:
        | { kind: "edit"; newSnapshot: MovementSnapshot }
        | { kind: "void" };
    };

/**
 * Decides a pending change. Whoever proposed it can never approve it.
 *
 * @param input - The pending change, the decision and who decides.
 * @returns What the decision does, or `AlreadyDecided`, `SelfApproval` or
 *   `MissingChanges`.
 */
export function decideChange(
  input: DecideInput,
): Result<DecisionOutcome, PendingChangeError> {
  const { pending, decision, actorId } = input;

  if (pending.status !== "pending") {
    return err({
      kind: "AlreadyDecided",
      message: "this change was already decided",
      pendingId: pending.id,
      status: pending.status,
    });
  }
  if (actorId === pending.proposedBy) {
    return err({
      kind: "SelfApproval",
      message: "the other partner must approve this change",
      pendingId: pending.id,
      actorId,
    });
  }

  if (decision === "reject") {
    return ok({ apply: false, pendingStatus: "rejected" });
  }
  if (pending.kind === "edit") {
    if (!pending.after) {
      return err({
        kind: "MissingChanges",
        message: "the pending change has no new values",
        movementId: pending.id,
      });
    }
    return ok({
      apply: true,
      pendingStatus: "approved",
      action: { kind: "edit", newSnapshot: pending.after },
    });
  }
  return ok({
    apply: true,
    pendingStatus: "approved",
    action: { kind: "void" },
  });
}
