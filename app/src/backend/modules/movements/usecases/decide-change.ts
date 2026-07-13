/**
 * UC-403 · The OTHER partner approves or rejects. Applying is atomic.
 *
 * This use case owns the TRÁMITE, not the EFFECT. It knows who may decide
 * (never the proposer — D1) and that the decision and its consequences land in
 * one transaction. It does NOT know that voiding a `repay` reopens a cuota, or
 * that voiding a `sell_inventory` will one day restock: that belongs to each
 * owner module. The effect arrives as `effectsFor`, wired in
 * application/apply-approved-change.ts.
 *
 * That is the rule that keeps the ledger from slowly learning everyone's rules.
 */
import { err, ok, type Result } from "@/lib/result";
import type { Write } from "../../../infra/db/write";
import { runAtomically } from "../../../infra/db/write";
import type { PendingChangeError } from "../domain/errors";
import type { MovementSnapshot, MovementType } from "../domain/movement";
import type { DecisionOutcome } from "../domain/pending";
import { decideChange as decide } from "../domain/pending";
import * as changeRepo from "../repositories/change-repository";

/** What an approved change asks the owner module to do. */
export type ApprovedChange =
  | { kind: "void"; movementId: string; movementType: MovementType }
  | {
      kind: "edit";
      movementId: string;
      movementType: MovementType;
      after: MovementSnapshot;
    };

/** The port: "this change was approved — give me the writes that apply it." */
export type EffectsFor = (change: ApprovedChange) => Write[];

export async function decideChange(
  effectsFor: EffectsFor,
  groupId: string,
  actorId: string,
  pendingId: string,
  decision: "approve" | "reject",
): Promise<Result<{ applied: boolean }, PendingChangeError>> {
  const change = await changeRepo.findWithMovement(pendingId);

  if (!change || change.movementGroup !== groupId) {
    return err({
      kind: "ChangeNotFound",
      message: "pending change not found in this group",
      pendingId,
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
    decision,
    actorId,
  });

  if (!outcome.ok) {
    return outcome;
  }

  const decided = changeRepo.decideStmt(pendingId, {
    status: outcome.value.pendingStatus,
    decidedBy: actorId,
    decidedAt: new Date(),
  });

  const effects = outcome.value.apply
    ? effectsFor(askOwnerFor(change, outcome.value))
    : [];

  await runAtomically([decided, ...effects]);

  return ok({ applied: outcome.value.apply });
}

/** Turns an approved outcome into the request the owner module answers. */
function askOwnerFor(
  change: { movementId: string; movementType: MovementType },
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
