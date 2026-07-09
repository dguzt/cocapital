/** Shared presenter: one movement → everything the feed/table shows. */
import type { LedgerMovement } from "@/backend/modules/movements/data";
import type { ISODate } from "@/lib/dates";
import { limaDateOf, limaTimeOf } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { DIR_BADGE, MOVEMENT_META } from "./movement-meta";

export type PresentedMovement = {
  id: string;
  title: string;
  concept: string | null;
  badgeCls: string;
  initial: string;
  author: string;
  authorInitial: string;
  day: string;
  amountText: string;
  amountCls: string;
  note: string | null;
  voided: boolean;
};

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

export function presentMovement(
  m: LedgerMovement,
  today: ISODate,
): PresentedMovement {
  const meta = MOVEMENT_META[m.type];
  const amount =
    meta.dir === "out"
      ? { text: `– ${formatCents(m.amount)}`, cls: "text-destructive" }
      : meta.dir === "in"
        ? { text: `+ ${formatCents(m.amount)}`, cls: "text-emerald-400" }
        : { text: formatCents(m.amount), cls: "" };

  const note =
    m.type === "sell_inventory" && m.cost !== null
      ? `Ganancia ${formatCents(m.amount - m.cost)}`
      : m.type === "repay" && m.cost !== null
        ? `Interés ${formatCents(m.amount - m.cost)}`
        : m.type === "buy_inventory"
          ? "→ Inventario"
          : m.type === "lend"
            ? "→ Prestado"
            : null;

  // "Cuándo" = registry time (createdAt), exact: "Hoy · 14:32", "8 ago · 09:15".
  const registeredDay = dayLabel(limaDateOf(m.createdAt), today);
  return {
    id: m.id,
    title: meta.label,
    concept: m.concept,
    badgeCls: DIR_BADGE[meta.dir],
    initial: meta.label[0],
    author: m.authorName,
    authorInitial: m.authorName[0]?.toUpperCase() ?? "?",
    day: `${registeredDay} · ${limaTimeOf(m.createdAt)}`,
    amountText: amount.text,
    amountCls: amount.cls,
    note,
    voided: m.status === "voided",
  };
}
