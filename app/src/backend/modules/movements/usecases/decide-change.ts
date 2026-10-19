import type { ApprovedChange } from "@/backend/modules/movements/domain/approved-change";
import type { ChangeUnderDecision } from "@/backend/modules/movements/domain/change-under-decision";
import type { PendingChangeError } from "@/backend/modules/movements/domain/errors";
import type { DecisionOutcome } from "@/backend/modules/movements/domain/pending";
import { decideChange as decide } from "@/backend/modules/movements/domain/pending";
import type { ChangeApplier } from "@/backend/modules/movements/ports/change-applier";
import type { ChangeRepository } from "@/backend/modules/movements/ports/change-repository";
import type { UnitOfWork } from "@/backend/shared/ports/unit-of-work";
import { err, ok, type Result } from "@/lib/result";

export type DecideChangeInput = {
  groupId: string;
  actorId: string;
  pendingId: string;
  decision: "approve" | "reject";
};

/**
 * Lets a partner other than the proposer approve or reject a change. An
 * approval is applied by the movement's owner, through the ChangeApplier, in
 * the same unit of work as the decision.
 */
export class DecideChange {
  static inject = ["changes", "applier", "uow"] as const;

  constructor(
    private readonly changes: ChangeRepository,
    private readonly applier: ChangeApplier,
    private readonly uow: UnitOfWork,
  ) {}

  /**
   * Decides the change and, when approved, applies it.
   *
   * @param input - The group, the deciding partner, the change and the
   *   decision.
   * @returns Whether the change was applied, or why it cannot be decided.
   */
  async execute(
    input: DecideChangeInput,
  ): Promise<Result<{ applied: boolean }, PendingChangeError>> {
    const change = await this.changes.findUnderDecision(input.pendingId);

    if (!change || change.movementGroup !== input.groupId) {
      return err({
        kind: "ChangeNotFound",
        message: "pending change not found in this group",
        pendingId: input.pendingId,
      });
    }

    const outcome = decide({
      pending: {
        id: change.id,
        status: change.status,
        proposedBy: change.proposedBy,
        kind: change.kind,
        after: change.after,
      },
      decision: input.decision,
      actorId: input.actorId,
    });

    if (!outcome.ok) {
      return outcome;
    }

    return this.uow.run(async () => {
      await this.changes.decide(input.pendingId, {
        status: outcome.value.pendingStatus,
        decidedBy: input.actorId,
        decidedAt: new Date(),
      });

      if (outcome.value.apply) {
        await this.applier.apply(this.approvedChange(change, outcome.value));
      }

      return ok({ applied: outcome.value.apply });
    });
  }

  private approvedChange(
    change: ChangeUnderDecision,
    outcome: Extract<DecisionOutcome, { apply: true }>,
  ): ApprovedChange {
    if (outcome.action.kind === "edit") {
      return {
        kind: "edit",
        movementId: change.movementId,
        movementType: change.movementType,
        after: outcome.action.newSnapshot,
      };
    }

    return {
      kind: "void",
      movementId: change.movementId,
      movementType: change.movementType,
    };
  }
}
