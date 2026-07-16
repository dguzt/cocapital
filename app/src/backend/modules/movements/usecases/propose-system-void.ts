/**
 * The legitimate door to propose a void on a SYSTEM-written movement.
 *
 * The movement dialog uses ProposeChange, which refuses `lend`/`repay` on
 * purpose ("corrígelo desde el préstamo"). But a feature that OWNS such a
 * movement may still propose to void it — a loan cancellation proposes a void
 * on its own `lend` (loans/usecases/propose-void-loan.ts). Routing it through
 * a real movement_changes row is what makes it appear in the same approval
 * inbox and go through the same doble confirmación.
 *
 * It still enforces the two invariants every proposal has: the movement is not
 * already voided, and at most one undecided change exists per movement (the
 * partial unique index is the one that actually holds under a race).
 */
import { err, ok, type Result } from "@/lib/result";
import type { PendingChangeError } from "../domain/errors";
import { proposeChange as decide } from "../domain/pending";
import type { ChangeRepository } from "../repositories/change-repository";
import type {
  MovementRepository,
  MovementRow,
} from "../repositories/movement-repository";

export type ProposeSystemVoidInput = {
  groupId: string;
  actorId: string;
  movementId: string;
};

export class ProposeSystemVoid {
  static inject = ["movements", "changes"] as const;

  constructor(
    private readonly movements: MovementRepository,
    private readonly changes: ChangeRepository,
  ) {}

  async execute(
    input: ProposeSystemVoidInput,
  ): Promise<Result<{ pendingId: string }, PendingChangeError>> {
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

    const proposal = decide({
      movement: {
        id: movement.id,
        status: movement.status,
        snapshot: this.snapshotOf(movement),
      },
      hasPendingChange: await this.changes.hasPendingFor(input.movementId),
      kind: "void",
      actorId: input.actorId,
    });

    if (!proposal.ok) {
      return proposal;
    }

    const row = await this.changes.insert(proposal.value);

    return ok({ pendingId: row.id });
  }

  private snapshotOf(movement: MovementRow) {
    return {
      type: movement.type,
      amount: movement.amount,
      cost: movement.cost,
      concept: movement.concept,
      date: movement.date,
    };
  }
}
