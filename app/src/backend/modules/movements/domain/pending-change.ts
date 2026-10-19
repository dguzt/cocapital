import { err, ok, type Result } from "@/lib/result";
import type { ChangeKind } from "./change-kind";
import type { DecisionOutcome } from "./decision-outcome";
import type { PendingChangeError } from "./errors";
import type { MovementSnapshot } from "./movement";
import type { PendingChangeSnapshot } from "./pending-change-snapshot";
import type { PendingStatus } from "./pending-status";

/** A stored change waiting for, or already given, a partner's decision. */
export class PendingChange {
  private constructor(
    readonly id: string,
    readonly status: PendingStatus,
    readonly proposedBy: string,
    readonly kind: ChangeKind,
    readonly after: MovementSnapshot | null,
  ) {}

  /**
   * Rebuilds a stored change.
   *
   * @param snapshot - Its id, status, proposer, kind and new values.
   * @returns The change, ready to be decided.
   */
  static restore(snapshot: PendingChangeSnapshot): PendingChange {
    return new PendingChange(
      snapshot.id,
      snapshot.status,
      snapshot.proposedBy,
      snapshot.kind,
      snapshot.after,
    );
  }

  /**
   * Approves or rejects the change. Whoever proposed it can never approve it.
   *
   * @param decision - Approve or reject.
   * @param actorId - The partner who decides.
   * @returns What the decision does, or `AlreadyDecided`, `SelfApproval` or
   *   `MissingChanges`.
   */
  decide(
    decision: "approve" | "reject",
    actorId: string,
  ): Result<DecisionOutcome, PendingChangeError> {
    if (this.status !== "pending") {
      return err({
        kind: "AlreadyDecided",
        message: "this change was already decided",
        pendingId: this.id,
        status: this.status,
      });
    }

    if (actorId === this.proposedBy) {
      return err({
        kind: "SelfApproval",
        message: "the other partner must approve this change",
        pendingId: this.id,
        actorId,
      });
    }

    if (decision === "reject") {
      return ok({ apply: false, pendingStatus: "rejected" });
    }

    if (this.kind === "void") {
      return ok({
        apply: true,
        pendingStatus: "approved",
        action: { kind: "void" },
      });
    }

    if (!this.after) {
      return err({
        kind: "MissingChanges",
        message: "the pending change has no new values",
        movementId: this.id,
      });
    }

    return ok({
      apply: true,
      pendingStatus: "approved",
      action: { kind: "edit", newSnapshot: this.after },
    });
  }
}
