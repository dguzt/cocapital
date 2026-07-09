/** Mobile activity list (the table is the desktop form — activity-table.tsx). */
import type { LedgerMovement } from "@/backend/modules/movements/data";
import type { ISODate } from "@/lib/dates";
import { presentMovement } from "./present";

export function ActivityFeed({
  movements,
  today,
  limit,
}: {
  movements: LedgerMovement[];
  today: ISODate;
  limit?: number;
}) {
  const items = (limit ? movements.slice(0, limit) : movements).map((m) =>
    presentMovement(m, today),
  );
  if (items.length === 0) return null;

  return (
    <ul className="divide-y divide-border">
      {items.map((it) => (
        <li key={it.id} className="flex items-center gap-3 py-3.5">
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
      ))}
    </ul>
  );
}
