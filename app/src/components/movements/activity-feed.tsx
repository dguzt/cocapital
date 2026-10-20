"use client";
/** Mobile activity list; each row opens the movement dialog (E4). */
import Link from "next/link";
import type { PlanChange } from "@/backend/modules/inventory/domain/plan-change";
import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import type { ISODate } from "@/lib/dates";
import { activityEntries, presentPlanChange } from "./activity-entries";
import { MovementDialog } from "./movement-dialog/movement-dialog";
import { presentMovement } from "./present";

export function ActivityFeed({
  movements,
  planChanges = [],
  today,
  pendingIds = [],
  limit,
}: {
  movements: LedgerMovement[];
  planChanges?: PlanChange[];
  today: ISODate;
  pendingIds?: string[];
  limit?: number;
}) {
  const entries = activityEntries(movements, planChanges, limit);
  if (entries.length === 0) return null;

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry) => {
        if (entry.kind === "plan") {
          const it = presentPlanChange(entry.change, today);
          return (
            <li key={entry.change.id}>
              <Link href={it.href} className="flex items-center gap-3 py-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-semibold text-muted-foreground">
                  P
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">
                    {it.title} · {it.concept}
                  </span>
                  <span className="block text-[13px] text-muted-foreground">
                    {it.author} · {it.day}
                  </span>
                </span>
                <span className="text-right font-mono text-[13px] tabular-nums text-muted-foreground">
                  {it.counts}
                </span>
              </Link>
            </li>
          );
        }
        const m = entry.movement;
        const it = presentMovement(m, today);
        const hasPending = pendingIds.includes(m.id);
        return (
          <MovementDialog key={m.id} movement={m} hasPending={hasPending}>
            <li className="flex cursor-pointer items-center gap-3 py-3.5">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${it.badgeCls}`}
              >
                {it.initial}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[15px] font-medium ${it.voided ? "line-through opacity-50" : ""}`}
                >
                  {it.title}
                  {it.concept ? ` · ${it.concept}` : ""}
                </span>
                <span className="block text-[13px] text-muted-foreground">
                  {it.author} · {it.day}
                  {hasPending && (
                    <span className="ml-1.5 text-amber-400">
                      · OK pendiente
                    </span>
                  )}
                </span>
              </span>
              <span className="text-right">
                <span
                  className={`block font-mono text-[15px] font-medium tabular-nums ${it.amountCls} ${it.voided ? "line-through opacity-50" : ""}`}
                >
                  {it.amountText}
                </span>
                {it.note && (
                  <span className="block text-xs text-muted-foreground">
                    {it.note}
                  </span>
                )}
              </span>
            </li>
          </MovementDialog>
        );
      })}
    </ul>
  );
}
