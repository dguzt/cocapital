"use server";

import { revalidatePath } from "next/cache";

import { useCases } from "@/backend/application/container";
import { requireMembership } from "@/backend/modules/groups/adapters/in/next/membership";
import type { NewCreditSale } from "@/backend/modules/inventory/domain/new-credit-sale";
import type { PlannedInstallment } from "@/backend/modules/inventory/domain/planned-installment";
import type { MovementType } from "@/backend/modules/movements/domain/movement";
import { todayInLima } from "@/lib/dates";

function revalidateSales(saleId?: string) {
  revalidatePath("/");
  revalidatePath("/actividad");
  revalidatePath("/ventas");

  if (saleId) {
    revalidatePath(`/ventas/${saleId}`);
  }
}

/**
 * Sells on credit from the sale form.
 *
 * @param input - The sale as built in the form.
 * @returns The new sale's id, or the kind of error.
 */
export async function createCreditSaleAction(input: NewCreditSale) {
  const { user, group } = await requireMembership();

  const result = await useCases.createCreditSale.execute({
    ...input,
    groupId: group.id,
    userId: user.id,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidateSales();

  return { ok: true as const, saleId: result.value.saleId };
}

/**
 * Collects one cuota of a credit sale today.
 *
 * @param saleId - The sale.
 * @param installmentId - The cuota.
 * @returns The amount collected, or the kind of error.
 */
export async function collectSaleInstallmentAction(
  saleId: string,
  installmentId: string,
) {
  const { user, group } = await requireMembership();

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

  revalidateSales(saleId);

  return { ok: true as const, amount: result.value.amount };
}

/**
 * Rewrites the pending cuotas of a credit sale.
 *
 * @param saleId - The sale.
 * @param installments - The new pending cuotas.
 * @returns How many cuotas there were and are, or the kind of error.
 */
export async function replanCreditSaleAction(
  saleId: string,
  installments: PlannedInstallment[],
) {
  const { user, group } = await requireMembership();

  const result = await useCases.replanCreditSale.execute({
    groupId: group.id,
    userId: user.id,
    saleId,
    installments,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidateSales(saleId);

  return { ok: true as const, ...result.value };
}

/**
 * Proposes cancelling a whole credit sale; another partner must approve it.
 *
 * @param saleId - The sale.
 * @returns Ok, or the kind of error.
 */
export async function proposeVoidCreditSaleAction(saleId: string) {
  const { user, group } = await requireMembership();

  const result = await useCases.proposeVoidCreditSale.execute({
    groupId: group.id,
    actorId: user.id,
    saleId,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidateSales(saleId);

  return { ok: true as const };
}

/**
 * Finds the credit sale, and for a cobro the cuota, that a ledger row leads to.
 *
 * @param movementId - The movement.
 * @param movementType - Its type.
 * @returns The target, or null when the movement is not a credit sale's.
 */
export async function getSaleTargetForMovementAction(
  movementId: string,
  movementType: MovementType,
) {
  const { group } = await requireMembership();

  const target = await useCases.getSaleTargetForMovement.execute({
    groupId: group.id,
    movementId,
    movementType,
  });

  return { ok: true as const, target };
}
