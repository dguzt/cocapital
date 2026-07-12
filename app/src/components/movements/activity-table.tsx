"use client";
/** Desktop activity table; each row opens the movement dialog (E4). */
import type { LedgerMovement } from "@/backend/modules/movements/usecases/list-movements";
import type { ISODate } from "@/lib/dates";
import { MovementDialog } from "./movement-dialog";
import { presentMovement } from "./present";

export function ActivityTable({
  movements,
  today,
  pendingIds = [],
  limit,
}: {
  movements: LedgerMovement[];
  today: ISODate;
  pendingIds?: string[];
  limit?: number;
}) {
  const items = limit ? movements.slice(0, limit) : movements;

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-border text-left">
          {["Movimiento", "Por", "Cuándo"].map((h) => (
            <th
              key={h}
              className="pb-3 pr-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {h}
            </th>
          ))}
          <th className="pb-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Monto
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((m) => {
          const it = presentMovement(m, today);
          const hasPending = pendingIds.includes(m.id);
          return (
            <MovementDialog key={m.id} movement={m} hasPending={hasPending}>
              <tr className="cursor-pointer border-b border-border last:border-0 hover:bg-white/[0.02]">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${it.badgeCls}`}
                    >
                      {it.initial}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block truncate text-sm font-semibold ${it.voided ? "line-through opacity-50" : ""}`}
                      >
                        {it.title}
                        {hasPending && (
                          <span className="ml-1.5 text-[11px] font-medium text-amber-400">
                            OK pendiente
                          </span>
                        )}
                      </span>
                      {it.concept && (
                        <span className="block max-w-64 truncate text-[13px] text-muted-foreground">
                          {it.concept}
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-3">
                  <span className="inline-flex items-center gap-2 whitespace-nowrap text-[13px] text-muted-foreground">
                    <span className="flex size-[22px] items-center justify-center rounded-full bg-secondary text-[11px] font-semibold">
                      {it.authorInitial}
                    </span>
                    {it.author}
                  </span>
                </td>
                <td className="whitespace-nowrap py-3 pr-3 text-[13px] text-muted-foreground">
                  {it.day}
                </td>
                <td className="py-3 text-right">
                  <span
                    className={`block whitespace-nowrap font-mono text-[14.5px] font-medium tabular-nums ${it.amountCls} ${it.voided ? "line-through opacity-50" : ""}`}
                  >
                    {it.amountText}
                  </span>
                  {it.note && (
                    <span className="block text-[11px] text-muted-foreground">
                      {it.note}
                    </span>
                  )}
                </td>
              </tr>
            </MovementDialog>
          );
        })}
      </tbody>
    </table>
  );
}
