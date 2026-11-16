import type { ChangeProposal } from "@/backend/modules/movements/domain/change-proposal";
import type { PendingChangeError } from "@/backend/modules/movements/domain/errors";
import type { MovementType } from "@/backend/modules/movements/domain/movement";
import type { ChangeApplier } from "@/backend/modules/movements/ports/change-applier";
import type { ChangeRepository } from "@/backend/modules/movements/ports/change-repository";
import type { MovementRepository } from "@/backend/modules/movements/ports/movement-repository";
import type { UnitOfWork } from "@/backend/shared/ports/unit-of-work";
import { err, ok, type Result } from "@/lib/result";

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
  static inject = ["changes", "movements", "applier", "uow"] as const;

  constructor(
    private readonly changes: ChangeRepository,
    private readonly movements: MovementRepository,
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
    const { proposal } = input;

    if (!input.alone) {
      const stored = await this.changes.propose(proposal);

      return stored
        ? ok({ pendingId: stored.id, applied: false })
        : this.alreadyPending(proposal.movementId);
    }

    return this.uow.run(async () => {
      const status = await this.movements.lock(proposal.movementId);

      if (status !== "active") {
        return err({
          kind: "MovementVoided",
          message: "cannot modify a voided movement",
          movementId: proposal.movementId,
        });
      }

      const stored = await this.changes.propose(proposal);

      if (!stored) {
        return this.alreadyPending(proposal.movementId);
      }

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

  private alreadyPending(
    movementId: string,
  ): Result<SubmittedChange, PendingChangeError> {
    return err({
      kind: "ChangeAlreadyPending",
      message: "this movement already has a change awaiting approval",
      movementId,
    });
  }
}
