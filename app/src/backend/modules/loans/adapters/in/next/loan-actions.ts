"use server";

import { revalidatePath } from "next/cache";

import { useCases } from "@/backend/application/container";
import { requireMembership } from "@/backend/modules/groups/adapters/in/next/membership";
import type { NewLoan } from "@/backend/modules/loans/domain/new-loan";
import type { MovementType } from "@/backend/modules/movements/domain/movement";
import { todayInLima } from "@/lib/dates";

/**
 * Lends money from the loan wizard.
 *
 * @param input - The loan as built in the wizard.
 * @returns The new loan's id, or the kind of error.
 */
export async function createLoanAction(input: NewLoan) {
  const { user, group } = await requireMembership();

  const result = await useCases.createLoan.execute({
    ...input,
    groupId: group.id,
    userId: user.id,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidatePath("/");
  revalidatePath("/prestamos");

  return { ok: true as const, loanId: result.value.loanId };
}

/**
 * Collects one cuota today.
 *
 * @param loanId - The loan.
 * @param installmentId - The cuota.
 * @returns The amount collected, or the kind of error.
 */
export async function collectInstallmentAction(
  loanId: string,
  installmentId: string,
) {
  const { user, group } = await requireMembership();

  const result = await useCases.collectInstallment.execute({
    groupId: group.id,
    userId: user.id,
    loanId,
    installmentId,
    today: todayInLima(),
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidatePath("/");
  revalidatePath("/prestamos");
  revalidatePath(`/prestamos/${loanId}`);

  return { ok: true as const, amount: result.value.amount };
}

/**
 * Proposes cancelling a whole loan; another partner must approve it.
 *
 * @param loanId - The loan.
 * @returns Ok, or the kind of error.
 */
export async function proposeVoidLoanAction(loanId: string) {
  const { user, group } = await requireMembership();

  const result = await useCases.proposeVoidLoan.execute({
    groupId: group.id,
    actorId: user.id,
    loanId,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidatePath("/");
  revalidatePath("/actividad");
  revalidatePath("/prestamos");
  revalidatePath(`/prestamos/${loanId}`);

  return { ok: true as const };
}

/**
 * Finds the loan, and for a repay the cuota, that a ledger row leads to.
 *
 * @param movementId - The movement.
 * @param movementType - Its type.
 * @returns The target, or null when the movement is not a loan's.
 */
export async function getLoanTargetForMovementAction(
  movementId: string,
  movementType: MovementType,
) {
  const { group } = await requireMembership();

  const target = await useCases.getLoanTargetForMovement.execute({
    groupId: group.id,
    movementId,
    movementType,
  });

  return { ok: true as const, target };
}
