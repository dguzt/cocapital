"use server";
/** M4 public API. */
import { revalidatePath } from "next/cache";
import type { Frequency, ISODate } from "@/lib/dates";
import { todayInLima } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import { requireUser } from "../accounts/current-user";
import { findGroupOf } from "../groups/data";
import * as data from "./data";

export type CreateLoanInput = {
  borrower: { id: string } | { name: string; phone?: string };
  capital: Cents;
  rateBps: number;
  frequency: Frequency;
  startDate: ISODate;
  installments: data.NewLoanInstallment[];
};

export async function createLoanAction(input: CreateLoanInput) {
  const user = await requireUser();
  const group = await findGroupOf(user.id);
  if (!group) return { ok: false as const, error: "NoGroup" };

  const result = await data.createLoan(group.id, user.id, input);
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

  const result = await data.collectInstallment(
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
