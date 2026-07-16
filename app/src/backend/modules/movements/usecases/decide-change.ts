/**
 * UC-403 · The OTHER partner approves or rejects. Applying is atomic.
 *
 * This use case owns the TRÁMITE, not the EFFECT. It knows who may decide
 * (never the proposer — D1) and that the decision and its consequences land in
 * one transaction. It does NOT know that voiding a `repay` reopens a cuota, or
 * that voiding a `sell_inventory` will one day restock: that belongs to each
 * owner module.
 *
 * It depends on the ChangeApplier INTERFACE, never on an implementation. The
 * container hands it the real one (application/apply-approved-change.ts), which
 * is the only place allowed to know every module. That is the rule that keeps
 * the ledger from slowly learning everyone's rules.
 */
import { err, ok, type Result } from "@/lib/result";
import type { UnitOfWork, Write } from "../../../infra/db/write";
import type { PendingChangeError } from "../domain/errors";
import type { MovementSnapshot, MovementType } from "../domain/movement";
import type { DecisionOutcome } from "../domain/pending";
import { decideChange as decide } from "../domain/pending";
import type {
  ChangeRepository,
  ChangeWithMovement,
} from "../repositories/change-repository";

/** What an approved change asks the owner module to do. */
export type ApprovedChange =
  | { kind: "void"; movementId: string; movementType: MovementType }
  | {
      kind: "edit";
      movementId: string;
      movementType: MovementType;
      after: MovementSnapshot;
    };

/** The port: "this change was approved — give me the writes that apply it."
 *  Async: some owners (voiding a loan) must read to know what to reverse. */
export interface ChangeApplier {
  writesFor(change: ApprovedChange): Promise<Write[]>;
}

export type DecideChangeInput = {
  groupId: string;
  actorId: string;
  pendingId: string;
  decision: "approve" | "reject";
};

export class DecideChange {
  static inject = ["changes", "applier", "uow"] as const;

  constructor(
    private readonly changes: ChangeRepository,
    private readonly applier: ChangeApplier,
    private readonly uow: UnitOfWork,
  ) {}

  async execute(
    input: DecideChangeInput,
  ): Promise<Result<{ applied: boolean }, PendingChangeError>> {
    const change = await this.changes.findWithMovement(input.pendingId);

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

    const decided = this.changes.decideStmt(input.pendingId, {
      status: outcome.value.pendingStatus,
      decidedBy: input.actorId,
      decidedAt: new Date(),
    });

    const effects = outcome.value.apply
      ? await this.applier.writesFor(this.askOwnerFor(change, outcome.value))
      : [];

    await this.uow.run([decided, ...effects]);

    return ok({ applied: outcome.value.apply });
  }

  /** Turns an approved outcome into the request the owner module answers. */
  private askOwnerFor(
    change: ChangeWithMovement,
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
