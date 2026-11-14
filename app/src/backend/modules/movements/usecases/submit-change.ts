import type { ChangeProposal } from "@/backend/modules/movements/domain/change-proposal";
import type { PendingChangeError } from "@/backend/modules/movements/domain/errors";
import type { MovementType } from "@/backend/modules/movements/domain/movement";
import type { ChangeApplier } from "@/backend/modules/movements/ports/change-applier";
import type { ChangeRepository } from "@/backend/modules/movements/ports/change-repository";
import type { UnitOfWork } from "@/backend/shared/ports/unit-of-work";
import { ok, type Result } from "@/lib/result";

export type SubmitChangeInput = {
  proposal: ChangeProposal;
  movementType: MovementType;
  alone: boolean;
};

export type SubmittedChange = {
  pendingId: string;
  applied: boolean;
};

/**
 * Stores a proposed change. In a group of one it is approved by its own
 * author and applied at once, so the history still records it.
 */
export class SubmitChange {
  static inject = ["changes", "applier", "uow"] as const;

  constructor(
    private readonly changes: ChangeRepository,
    private readonly applier: ChangeApplier,
    private readonly uow: UnitOfWork,
  ) {}

  /**
   * Opens the change, or applies it when the author is alone in the group.
   *
   * @param input - The proposal, the type of its movement and whether the
   *   author is the group's only member.
   * @returns The stored change's id and whether it was already applied.
   */
  async execute(
    input: SubmitChangeInput,
  ): Promise<Result<SubmittedChange, PendingChangeError>> {
    if (!input.alone) {
      const stored = await this.changes.propose(input.proposal);

      return ok({ pendingId: stored.id, applied: false });
    }

    return this.uow.run(async () => {
      const stored = await this.changes.propose(input.proposal);

      await this.changes.decide(stored.id, {
        status: "approved",
        decidedBy: input.proposal.proposedBy,
        decidedAt: new Date(),
      });

      await this.applier.apply(
        input.proposal.approvedAlone(input.movementType),
      );

      return ok({ pendingId: stored.id, applied: true });
    });
  }
}
