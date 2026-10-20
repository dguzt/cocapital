import type { PlanChange } from "@/backend/modules/inventory/domain/plan-change";
import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import { type ISODate, limaDateOf, limaTimeOf } from "@/lib/dates";
import { dayLabel } from "./present";

/** One row of the activity: a ledger movement, or a rewrite of a sale's plan. */
export type ActivityEntry =
  | { kind: "movement"; movement: LedgerMovement }
  | { kind: "plan"; change: PlanChange };

/**
 * Merges movements and plan rewrites, newest first.
 *
 * @param movements - The ledger, newest first.
 * @param planChanges - The rewrites of credit sale plans.
 * @param limit - How many rows to keep, if any.
 * @returns The rows of the activity.
 */
export function activityEntries(
  movements: LedgerMovement[],
  planChanges: PlanChange[],
  limit?: number,
): ActivityEntry[] {
  const entries: ActivityEntry[] = [
    ...movements.map((movement) => ({ kind: "movement" as const, movement })),
    ...planChanges.map((change) => ({ kind: "plan" as const, change })),
  ].sort((a, b) => createdAtOf(b).getTime() - createdAtOf(a).getTime());

  return limit ? entries.slice(0, limit) : entries;
}

/**
 * What a plan rewrite row shows.
 *
 * @param change - The rewrite.
 * @param today - Today's date in Lima.
 * @returns The title, subtitle, counts and time of the row.
 */
export function presentPlanChange(change: PlanChange, today: ISODate) {
  return {
    title: "Plan cambiado",
    concept: `${change.buyerName} · ${change.item}`,
    counts: `${change.fromCount} → ${change.toCount} cuotas`,
    author: change.authorName,
    authorInitial: change.authorName[0]?.toUpperCase() ?? "?",
    day: `${dayLabel(limaDateOf(change.createdAt), today)} · ${limaTimeOf(change.createdAt)}`,
    href: `/ventas/${change.saleId}`,
  };
}

function createdAtOf(entry: ActivityEntry): Date {
  return entry.kind === "movement"
    ? entry.movement.createdAt
    : entry.change.createdAt;
}
