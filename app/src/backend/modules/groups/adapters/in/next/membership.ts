import { redirect } from "next/navigation";

import { useCases } from "@/backend/application/container";
import { requireUser } from "@/backend/modules/accounts/adapters/in/next/session";
import type { User } from "@/backend/modules/accounts/domain/user";
import type { Group } from "@/backend/modules/groups/domain/group";

/** The partner of the current session and the group they work in. */
export type Membership = {
  user: User;
  group: Group;
};

/**
 * Reads who is asking and in which group, on routes that need a group.
 *
 * @returns The partner and their group.
 * @throws A redirect to the onboarding at "/" when the partner has no group.
 */
export async function requireMembership(): Promise<Membership> {
  const user = await requireUser();

  const group = await useCases.getMyGroup.execute({ userId: user.id });

  if (!group) {
    redirect("/");
  }

  return { user, group };
}
