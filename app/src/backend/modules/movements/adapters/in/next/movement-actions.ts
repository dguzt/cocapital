"use server";

import { useCases } from "@/backend/application/container";
import {
  requireMembership,
  revalidateGroup,
} from "@/backend/modules/groups/adapters/in/next/membership";
import { ManualMovement } from "@/backend/modules/movements/domain/manual-movement";
import type { MovementSnapshot } from "@/backend/modules/movements/domain/movement";
import { todayInLima } from "@/lib/dates";
import { solesToCents } from "@/lib/money";

export type AddMovementForm = {
  type: string;
  amountSoles: string;
  costSoles?: string;
  concept?: string;
};

/**
 * Writes a movement typed in the "Nuevo movimiento" sheet.
 *
 * @param groupId - The group the partner works in.
 * @param input - The form fields, amounts in soles.
 * @returns Ok, or the kind of validation error.
 */
export async function addMovementAction(
  groupId: string,
  input: AddMovementForm,
) {
  const { user, group } = await requireMembership(groupId);

  const validated = ManualMovement.parse({ ...input, today: todayInLima() });

  if (!validated.ok) {
    return { ok: false as const, error: validated.error.kind };
  }

  await useCases.addMovement.execute({
    ...validated.value,
    groupId: group.id,
    userId: user.id,
  });

  revalidateGroup(groupId);

  return { ok: true as const };
}

/**
 * Proposes new values for a movement; another partner must approve them,
 * unless the partner is alone.
 *
 * @param groupId - The group the partner works in.
 * @param movementId - The movement.
 * @param input - The new amount, concept and cost, in soles.
 * @param before - The movement as the partner saw it.
 * @returns Whether it was applied at once, or the kind of error.
 */
export async function proposeEditAction(
  groupId: string,
  movementId: string,
  input: { amountSoles: string; concept: string; costSoles?: string },
  before: MovementSnapshot,
) {
  const { user, group } = await requireMembership(groupId);

  const amount = solesToCents(input.amountSoles);

  if (amount === null || amount <= 0) {
    return { ok: false as const, error: "InvalidAmount" };
  }

  const cost = input.costSoles?.trim() ? solesToCents(input.costSoles) : null;

  if (input.costSoles?.trim() && (cost === null || cost <= 0)) {
    return { ok: false as const, error: "InvalidCost" };
  }

  const after: MovementSnapshot = {
    ...before,
    amount,
    concept: input.concept.trim() || null,
    cost: before.type === "sell_inventory" ? cost : before.cost,
  };

  const result = await useCases.proposeChange.execute({
    groupId: group.id,
    actorId: user.id,
    alone: group.isAlone(),
    movementId,
    kind: "edit",
    after,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidateGroup(groupId);

  return { ok: true as const, applied: result.value.applied };
}

/**
 * Proposes voiding a movement; on a repay this undoes the collection once
 * another partner approves it.
 *
 * @param groupId - The group the partner works in.
 * @param movementId - The movement.
 * @returns Whether it was applied at once, or the kind of error.
 */
export async function proposeVoidAction(groupId: string, movementId: string) {
  const { user, group } = await requireMembership(groupId);

  const result = await useCases.proposeChange.execute({
    groupId: group.id,
    actorId: user.id,
    alone: group.isAlone(),
    movementId,
    kind: "void",
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidateGroup(groupId);

  return { ok: true as const, applied: result.value.applied };
}

/**
 * Approves or rejects a change another partner proposed.
 *
 * @param groupId - The group the partner works in.
 * @param pendingId - The change.
 * @param decision - Approve or reject.
 * @returns Whether it was applied, or the kind of error.
 */
export async function decideChangeAction(
  groupId: string,
  pendingId: string,
  decision: "approve" | "reject",
) {
  const { user, group } = await requireMembership(groupId);

  const result = await useCases.decideChange.execute({
    groupId: group.id,
    actorId: user.id,
    pendingId,
    decision,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidateGroup(groupId);

  return { ok: true as const, applied: result.value.applied };
}

/**
 * Reads every change proposed on a movement, for its detail dialog.
 *
 * @param groupId - The group the partner works in.
 * @param movementId - The movement.
 * @returns The history, newest first.
 */
export async function getMovementHistoryAction(
  groupId: string,
  movementId: string,
) {
  const { group } = await requireMembership(groupId);

  const history = await useCases.getMovementHistory.execute({
    groupId: group.id,
    movementId,
  });

  return { ok: true as const, history };
}
