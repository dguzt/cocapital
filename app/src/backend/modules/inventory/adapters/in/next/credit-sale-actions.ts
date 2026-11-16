"use server";

import { useCases } from "@/backend/application/container";
import {
  requireMembership,
  revalidateGroup,
} from "@/backend/modules/groups/adapters/in/next/membership";
import type { NewCreditSale } from "@/backend/modules/inventory/domain/new-credit-sale";
import type { PlannedInstallment } from "@/backend/modules/inventory/domain/planned-installment";
import type { MovementType } from "@/backend/modules/movements/domain/movement";
import { todayInLima } from "@/lib/dates";

/**
 * Sells on credit from the sale form.
 *
 * @param groupId - The group the partner works in.
 * @param input - The sale as built in the form.
 * @returns The new sale's id, or the kind of error.
 */
export async function createCreditSaleAction(
  groupId: string,
  input: NewCreditSale,
) {
  const { user, group } = await requireMembership(groupId);

  const throttled = await useCases.throttleWrites.execute({ userId: user.id });

  if (!throttled.ok) {
    return { ok: false as const, error: throttled.error.kind };
  }

  const result = await useCases.createCreditSale.execute({
    ...input,
    groupId: group.id,
    userId: user.id,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidateGroup(groupId);

  return { ok: true as const, saleId: result.value.saleId };
}

/**
 * Collects one cuota of a credit sale today.
 *
 * @param groupId - The group the partner works in.
 * @param saleId - The sale.
 * @param installmentId - The cuota.
 * @returns The amount collected, or the kind of error.
 */
export async function collectSaleInstallmentAction(
  groupId: string,
  saleId: string,
  installmentId: string,
) {
  const { user, group } = await requireMembership(groupId);

  const throttled = await useCases.throttleWrites.execute({ userId: user.id });

  if (!throttled.ok) {
    return { ok: false as const, error: throttled.error.kind };
  }

  const result = await useCases.collectSaleInstallment.execute({
    groupId: group.id,
    userId: user.id,
    saleId,
    installmentId,
    today: todayInLima(),
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidateGroup(groupId);

  return { ok: true as const, amount: result.value.amount };
}

/**
 * Rewrites the pending cuotas of a credit sale.
 *
 * @param groupId - The group the partner works in.
 * @param saleId - The sale.
 * @param installments - The new pending cuotas.
 * @returns How many cuotas there were and are, or the kind of error.
 */
export async function replanCreditSaleAction(
  groupId: string,
  saleId: string,
  installments: PlannedInstallment[],
) {
  const { user, group } = await requireMembership(groupId);

  const throttled = await useCases.throttleWrites.execute({ userId: user.id });

  if (!throttled.ok) {
    return { ok: false as const, error: throttled.error.kind };
  }

  const result = await useCases.replanCreditSale.execute({
    groupId: group.id,
    userId: user.id,
    saleId,
    installments,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidateGroup(groupId);

  return { ok: true as const, ...result.value };
}

/**
 * Proposes cancelling a whole credit sale; another partner must approve it, unless
 * the partner is alone.
 *
 * @param groupId - The group the partner works in.
 * @param saleId - The sale.
 * @returns Whether it was applied at once, or the kind of error.
 */
export async function proposeVoidCreditSaleAction(
  groupId: string,
  saleId: string,
) {
  const { user, group } = await requireMembership(groupId);

  const throttled = await useCases.throttleWrites.execute({ userId: user.id });

  if (!throttled.ok) {
    return { ok: false as const, error: throttled.error.kind };
  }

  const result = await useCases.proposeVoidCreditSale.execute({
    groupId: group.id,
    actorId: user.id,
    alone: group.isAlone(),
    saleId,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidateGroup(groupId);

  return { ok: true as const, applied: result.value.applied };
}

/**
 * Finds the credit sale, and for a cobro the cuota, that a ledger row leads to.
 *
 * @param groupId - The group the partner works in.
 * @param movementId - The movement.
 * @param movementType - Its type.
 * @returns The target, or null when the movement is not a credit sale's.
 */
export async function getSaleTargetForMovementAction(
  groupId: string,
  movementId: string,
  movementType: MovementType,
) {
  const { group } = await requireMembership(groupId);

  const target = await useCases.getSaleTargetForMovement.execute({
    groupId: group.id,
    movementId,
    movementType,
  });

  return { ok: true as const, target };
}
