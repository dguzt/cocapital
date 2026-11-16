"use server";

import { requireMembership } from "@/backend/modules/groups/adapters/in/next/membership";
import {
  type ActivityCursor,
  type ActivityPage,
  readActivityPage,
} from "./activity-page";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOTHING: ActivityPage = { movements: [], planChanges: [], next: null };

/**
 * Reads the activity older than what the partner already sees ("Ver más").
 *
 * @param groupId - The group the partner works in.
 * @param cursor - The last movement and plan rewrite already shown.
 * @returns The next page, or nothing when the cursor is not valid.
 */
export async function loadMoreActivityAction(
  groupId: string,
  cursor: ActivityCursor,
): Promise<ActivityPage> {
  const { group } = await requireMembership(groupId);

  const ids = [cursor?.movement, cursor?.plan];

  const valid = ids.every(
    (id) => id === undefined || (typeof id === "string" && UUID.test(id)),
  );

  if (!valid) {
    return NOTHING;
  }

  return readActivityPage(group.id, {
    movement: cursor.movement,
    plan: cursor.plan,
  });
}
