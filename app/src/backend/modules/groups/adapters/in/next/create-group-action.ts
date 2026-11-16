"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { useCases } from "@/backend/application/container";
import { requireUser } from "@/backend/modules/accounts/adapters/in/next/session";
import { groupPath } from "@/lib/group-path";

/**
 * Founds a group from the new-group form and opens its panel.
 *
 * @param formData - The form, with the group name in `name`.
 */
export async function createGroupAction(formData: FormData) {
  const user = await requireUser();

  const throttled = await useCases.throttleWrites.execute({ userId: user.id });

  if (!throttled.ok) {
    redirect(`/grupos/nuevo?error=${throttled.error.kind}`);
  }

  const result = await useCases.createGroup.execute({
    creator: {
      userId: user.id,
      name: user.name,
    },
    name: String(formData.get("name") ?? ""),
  });

  if (!result.ok) {
    redirect(`/grupos/nuevo?error=${result.error.kind}`);
  }

  revalidatePath("/");

  redirect(groupPath(result.value.id));
}
