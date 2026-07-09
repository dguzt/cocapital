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
