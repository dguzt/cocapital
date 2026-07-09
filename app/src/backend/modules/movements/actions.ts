"use server";
/** M3 public API. */
import { revalidatePath } from "next/cache";
import { todayInLima } from "@/lib/dates";
import { requireUser } from "../accounts/current-user";
import { findGroupOf } from "../groups/data";
import * as data from "./data";
import { validateNewMovement } from "./domain/validate";

export type AddMovementInput = {
  type: string;
  amountSoles: string;
  costSoles?: string;
  concept?: string;
};

export async function addMovementAction(input: AddMovementInput) {
  const user = await requireUser();
  const group = await findGroupOf(user.id);
  if (!group) return { ok: false as const, error: "NoGroup" };

  const validated = validateNewMovement({ ...input, today: todayInLima() });
  if (!validated.ok) {
    return { ok: false as const, error: validated.error.kind };
  }

  await data.addMovement(group.id, user.id, validated.value);
  revalidatePath("/");
  return { ok: true as const };
}
