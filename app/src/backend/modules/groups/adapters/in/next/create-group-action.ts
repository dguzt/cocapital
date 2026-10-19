"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { useCases } from "@/backend/application/container";
import { requireUser } from "@/backend/modules/accounts/adapters/in/next/session";

/**
 * Founds a group from the onboarding form and opens its panel.
 *
 * @param formData - The form, with the group name in `name`.
 */
export async function createGroupAction(formData: FormData) {
  const user = await requireUser();

  const result = await useCases.createGroup.execute({
    creator: {
      userId: user.id,
      name: user.name,
    },
    name: String(formData.get("name") ?? ""),
  });

  if (!result.ok) {
    redirect(`/?error=${result.error.kind}`);
  }

  revalidatePath("/");

  redirect("/");
}
