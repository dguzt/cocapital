"use server";
/** M4's edge with Next: session → use case → revalidate. No rules here. */
import { revalidatePath } from "next/cache";
import { todayInLima } from "@/lib/dates";
import { requireUser } from "../accounts/current-user";
import { findGroupOf } from "../groups/data";
import type { NewLoan } from "./domain/loan";
import { collectInstallment } from "./usecases/collect-installment";
import { createLoan } from "./usecases/create-loan";

export type CreateLoanInput = NewLoan;

export async function createLoanAction(input: CreateLoanInput) {
  const user = await requireUser();
  const group = await findGroupOf(user.id);
  if (!group) return { ok: false as const, error: "NoGroup" };

  const result = await createLoan(group.id, user.id, input);
  if (!result.ok) return { ok: false as const, error: result.error.kind };

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
  if (!group) return { ok: false as const, error: "NoGroup" };

  const result = await collectInstallment(
    group.id,
    user.id,
    loanId,
    installmentId,
    todayInLima(),
  );
  if (!result.ok) return { ok: false as const, error: result.error.kind };

  revalidatePath("/");
  revalidatePath("/prestamos");
  revalidatePath(`/prestamos/${loanId}`);
  return { ok: true as const, amount: result.value.amount };
}
