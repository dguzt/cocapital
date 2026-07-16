"use server";
/** M4's edge with Next: session → use case → revalidate. No rules here. */
import { revalidatePath } from "next/cache";

import { todayInLima } from "@/lib/dates";
import { useCases } from "../../application/container";
import { requireUser } from "../accounts/current-user";
import { findGroupOf } from "../groups/data";
import type { NewLoan } from "./domain/loan";

export type CreateLoanInput = NewLoan;

export async function createLoanAction(input: CreateLoanInput) {
  const user = await requireUser();
  const group = await findGroupOf(user.id);

  if (!group) {
    return { ok: false as const, error: "NoGroup" };
  }

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

export async function collectInstallmentAction(
  loanId: string,
  installmentId: string,
) {
  const user = await requireUser();
  const group = await findGroupOf(user.id);

  if (!group) {
    return { ok: false as const, error: "NoGroup" };
  }

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
 * UC-306: propose to cancel an entire loan. Goes pending — the partner approves
 * it in the shared inbox, and only then is the lend + every collection voided.
 */
export async function proposeVoidLoanAction(loanId: string) {
  const user = await requireUser();
  const group = await findGroupOf(user.id);

  if (!group) {
    return { ok: false as const, error: "NoGroup" };
  }

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
