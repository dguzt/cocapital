/** Desktop activity — the prototype's table: Movimiento · Por · Cuándo · Monto. */
import type { LedgerMovement } from "@/backend/modules/movements/data";
import type { ISODate } from "@/lib/dates";
import { presentMovement } from "./present";

export function ActivityTable({
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
        {items.map((it) => (
          <tr
            key={it.id}
            className="border-b border-border last:border-0 hover:bg-white/[0.02]"
          >
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
              <span className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
                <span className="flex size-[22px] items-center justify-center rounded-full bg-secondary text-[11px] font-semibold">
                  {it.authorInitial}
                </span>
                {it.author}
              </span>
            </td>
            <td className="py-3 pr-3 text-[13px] text-muted-foreground">
              {it.day}
            </td>
            <td className="py-3 text-right">
              <span
                className={`block font-mono text-[14.5px] font-medium tabular-nums ${it.amountCls} ${it.voided ? "line-through opacity-50" : ""}`}
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
        ))}
      </tbody>
    </table>
  );
}
