"use server";
/** M2 public API — server actions bind the auth seam to the data layer. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../accounts/current-user";
import * as data from "./data";

export async function createGroupAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "");
  const result = await data.createGroup(user.id, name);
  if (!result.ok) {
    redirect(`/?error=${result.error.kind}`);
  }
  revalidatePath("/");
  redirect("/");
}

/**
 * Security M2: joining is an explicit POST behind a confirmation button — a
 * mutation must never run on a GET page render (a prefetch/link-preview of
 * /join/<code> could otherwise silently trap a user in an attacker's group).
 */
export async function joinGroupAction(formData: FormData) {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").toUpperCase();
  const result = await data.joinGroup(user.id, code);
  if (!result.ok) {
    redirect(`/join/${encodeURIComponent(code)}?error=${result.error.kind}`);
  }
  revalidatePath("/");
  redirect("/");
}
