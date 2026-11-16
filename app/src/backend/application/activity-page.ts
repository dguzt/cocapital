import "server-only";
import * as R from "remeda";
import type { PlanChange } from "@/backend/modules/inventory/domain/plan-change";
import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import { useCases } from "./container";

/** The last movement and the last plan rewrite the reader has already seen. */
export type ActivityCursor = {
  movement?: string;
  plan?: string;
};

/** One page of the activity: movements and plan rewrites, merged newest first. */
export type ActivityPage = {
  movements: LedgerMovement[];
  planChanges: PlanChange[];
  /** Where the next page starts; null when nothing older is left. */
  next: ActivityCursor | null;
};

export const ACTIVITY_PAGE_SIZE = 50;

/**
 * Reads the next page of the activity after what the reader has seen.
 *
 * @param groupId - The group, already checked as the reader's.
 * @param cursor - The last movement and plan rewrite already shown.
 * @returns Up to one page of entries and the cursor of the page after it.
 */
export async function readActivityPage(
  groupId: string,
  cursor: ActivityCursor,
): Promise<ActivityPage> {
  const [movements, planChanges] = await Promise.all([
    useCases.listMovements.execute({
      groupId,
      limit: ACTIVITY_PAGE_SIZE + 1,
      after: cursor.movement,
    }),
    useCases.listPlanChanges.execute({
      groupId,
      limit: ACTIVITY_PAGE_SIZE + 1,
      after: cursor.plan,
    }),
  ]);

  const shown = R.pipe(
    [
      ...movements.map((movement) => ({
        id: movement.id,
        at: movement.createdAt,
      })),
      ...planChanges.map((change) => ({ id: change.id, at: change.createdAt })),
    ],
    R.sortBy([(entry) => entry.at.getTime(), "desc"]),
    R.take(ACTIVITY_PAGE_SIZE),
    R.map((entry) => entry.id),
    (ids) => new Set(ids),
  );

  const shownMovements = movements.filter((movement) => shown.has(movement.id));

  const shownPlanChanges = planChanges.filter((change) => shown.has(change.id));

  const hasMore = movements.length + planChanges.length > ACTIVITY_PAGE_SIZE;

  return {
    movements: shownMovements,
    planChanges: shownPlanChanges,
    next: hasMore
      ? {
          movement: shownMovements.at(-1)?.id ?? cursor.movement,
          plan: shownPlanChanges.at(-1)?.id ?? cursor.plan,
        }
      : null,
  };
}
