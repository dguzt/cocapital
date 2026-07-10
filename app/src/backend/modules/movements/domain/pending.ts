/**
 * Pending-change state machine (TASK-401, E4/D1).
 * A movement edit/void NEVER applies directly: it becomes a pending change
 * the OTHER partner must approve. Pure decisions — the data layer executes
 * the returned instructions. Nothing is ever physically deleted.
 */
import { err, ok, type Result } from "@/lib/result";
import type { PendingChangeError } from "./errors";
import type { MovementSnapshot, MovementStatus } from "./movement";

export type ChangeKind = "edit" | "void";
export type PendingStatus = "pending" | "approved" | "rejected";

export type ProposeInput = {
  movement: { id: string; status: MovementStatus; snapshot: MovementSnapshot };
  /** Is there already an undecided change for this movement? (one at a time) */
  hasPendingChange: boolean;
  kind: ChangeKind;
  /** Required for edit; ignored for void. */
  after?: MovementSnapshot;
  actorId: string;
};

/** What the data layer must insert. `before` is the immutable EditLog seed. */
export type ProposedChange = {
  movementId: string;
  kind: ChangeKind;
  proposedBy: string;
  before: MovementSnapshot;
  after: MovementSnapshot | null;
};

/**
 * Security H1: an edit may change only amount/concept/cost. Rebuild the
 * immutable fields (`type`, `date`) from the trusted stored snapshot rather
 * than the client's proposal, and drop `cost` on any non-sell type. Pure so
 * it can be unit-tested without a DB.
 */
export function sanitizeEditedSnapshot(
  trusted: MovementSnapshot,
  proposed: MovementSnapshot,
): MovementSnapshot {
  return {
    ...proposed,
    type: trusted.type,
    date: trusted.date,
    cost: trusted.type === "sell_inventory" ? proposed.cost : null,
  };
}

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

/** Instructions for the data layer when a decision lands. */
export type DecisionOutcome =
  | { apply: false; pendingStatus: "rejected" }
  | {
      apply: true;
      pendingStatus: "approved";
      action:
        | { kind: "edit"; newSnapshot: MovementSnapshot }
        | { kind: "void" };
    };

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
  // The trust rule (D1): the proposer can never approve their own change.
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
