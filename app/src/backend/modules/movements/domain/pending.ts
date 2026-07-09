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

export function proposeChange(
  input: ProposeInput,
): Result<ProposedChange, PendingChangeError> {
  const { movement, hasPendingChange, kind, after, actorId } = input;

  if (movement.status === "voided") {
    return err({
      kind: "MovementVoided",
      message: "No se puede modificar un movimiento anulado",
      movementId: movement.id,
    });
  }
  if (hasPendingChange) {
    return err({
      kind: "ChangeAlreadyPending",
      message: "Este movimiento ya tiene un cambio esperando aprobación",
      movementId: movement.id,
    });
  }
  if (kind === "edit" && !after) {
    return err({
      kind: "MissingChanges",
      message: "Una edición debe incluir los nuevos valores",
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
      message: "Este cambio ya fue resuelto",
      pendingId: pending.id,
      status: pending.status,
    });
  }
  // The trust rule (D1): the proposer can never approve their own change.
  if (actorId === pending.proposedBy) {
    return err({
      kind: "SelfApproval",
      message: "El otro socio debe aprobar este cambio",
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
        message: "El cambio pendiente no tiene nuevos valores",
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
