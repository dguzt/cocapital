import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { cache } from "react";

import { useCases } from "@/backend/application/container";
import { requireUser } from "@/backend/modules/accounts/adapters/in/next/session";
import type { User } from "@/backend/modules/accounts/domain/user";
import type { Group } from "@/backend/modules/groups/domain/group";
import { groupPath } from "@/lib/group-path";

/** The partner of the current session and the group they work in. */
export type Membership = {
  user: User;
  group: Group;
};

/**
 * Reads who is asking and checks they belong to the group they ask for.
 *
 * @param groupId - The group, as it comes in the URL or the action call.
 * @returns The partner and that group.
 * @throws A 404 when the group does not exist or the partner is not in it.
 */
export const requireMembership = cache(
  async (groupId: string): Promise<Membership> => {
    const user = await requireUser();

    const group = await useCases.getGroupOf.execute({
      userId: user.id,
      groupId,
    });

    if (!group) {
      notFound();
    }

    return { user, group };
  },
);

/**
 * Refreshes every page of a group after a write.
 *
 * @param groupId - The group that changed.
 */
export function revalidateGroup(groupId: string): void {
  revalidatePath(groupPath(groupId), "layout");
}
