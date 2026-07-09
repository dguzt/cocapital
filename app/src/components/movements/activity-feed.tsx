/** UC-203: recent activity, newest first, author shown, margin/interest notes. */
import type { LedgerMovement } from "@/backend/modules/movements/data";
import type { ISODate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { DIR_BADGE, MOVEMENT_META } from "./movement-meta";

function dayLabel(date: ISODate, today: ISODate): string {
  if (date === today) return "Hoy";
  const [y, m, d] = today.split("-").map(Number);
  const yesterday = new Date(Date.UTC(y, m - 1, d - 1))
    .toISOString()
    .slice(0, 10);
  if (date === yesterday) return "Ayer";
  const MONTHS = "ene feb mar abr may jun jul ago sep oct nov dic".split(" ");
  const [, mm, dd] = date.split("-").map(Number);
  return `${dd} ${MONTHS[mm - 1]}`;
}

function amountText(m: LedgerMovement): { text: string; cls: string } {
  const meta = MOVEMENT_META[m.type];
  if (meta.dir === "out")
    return { text: `– ${formatCents(m.amount)}`, cls: "text-red-400" };
  if (meta.dir === "in")
    return { text: `+ ${formatCents(m.amount)}`, cls: "text-emerald-400" };
  return { text: formatCents(m.amount), cls: "" };
}

function note(m: LedgerMovement): string | null {
  if (m.type === "sell_inventory" && m.cost !== null)
    return `Ganancia ${formatCents(m.amount - m.cost)}`;
  if (m.type === "repay" && m.cost !== null)
    return `Interés ${formatCents(m.amount - m.cost)}`;
  if (m.type === "buy_inventory") return "→ Inventario";
  if (m.type === "lend") return "→ Prestado";
  return null;
}

export function ActivityFeed({
  movements,
  today,
  limit,
}: {
  movements: LedgerMovement[];
  today: ISODate;
  limit?: number;
}) {
  const items = limit ? movements.slice(0, limit) : movements;
  if (items.length === 0) return null;

  return (
    <ul className="divide-y divide-border">
      {items.map((m) => {
        const meta = MOVEMENT_META[m.type];
        const amt = amountText(m);
        const n = note(m);
        return (
          <li key={m.id} className="flex items-center gap-3 py-3.5">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${DIR_BADGE[meta.dir]}`}
            >
              {meta.label[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-[15px] font-medium ${m.status === "voided" ? "line-through opacity-50" : ""}`}
              >
                {meta.label}
                {m.concept ? ` · ${m.concept}` : ""}
              </span>
              <span className="block text-[13px] text-muted-foreground">
                {m.authorName} · {dayLabel(m.date, today)}
              </span>
            </span>
            <span className="text-right">
              <span
                className={`block font-mono text-[15px] font-medium tabular-nums ${amt.cls} ${m.status === "voided" ? "line-through opacity-50" : ""}`}
              >
                {amt.text}
              </span>
              {n && (
                <span className="block text-xs text-muted-foreground">{n}</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
