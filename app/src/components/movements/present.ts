/** Shared presenter: one movement → everything the feed/table shows. */
import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import type { Dictionary } from "@/i18n/dictionaries";
import type { ISODate } from "@/lib/dates";
import { formatDayMonth, limaDateOf, limaTimeOf } from "@/lib/dates";
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

/** "Today", "Yesterday" or "8 Aug" for a day, in the reader's language. */
export function dayLabel(
  date: ISODate,
  today: ISODate,
  t: Dictionary["dates"],
): string {
  if (date === today) return t.today;
  const [y, m, d] = today.split("-").map(Number);
  const yesterday = new Date(Date.UTC(y, m - 1, d - 1))
    .toISOString()
    .slice(0, 10);
  if (date === yesterday) return t.yesterday;
  return formatDayMonth(date, t.shortMonths);
}

export function presentMovement(
  m: LedgerMovement,
  today: ISODate,
  t: Dictionary,
): PresentedMovement {
  const meta = MOVEMENT_META[m.type];
  const label = t.movementTypes[m.type].label;
  const amount =
    meta.dir === "out"
      ? { text: `– ${formatCents(m.amount)}`, cls: "text-destructive" }
      : meta.dir === "in"
        ? { text: `+ ${formatCents(m.amount)}`, cls: "text-emerald-400" }
        : { text: formatCents(m.amount), cls: "" };

  const note =
    m.type === "sell_inventory" && m.cost !== null
      ? t.activity.profit(formatCents(m.amount - m.cost))
      : m.type === "repay" && m.cost !== null
        ? t.activity.interest(formatCents(m.amount - m.cost))
        : m.type === "collect_sale" && m.cost !== null && m.cost < m.amount
          ? t.activity.profit(formatCents(m.amount - m.cost))
          : m.type === "sell_on_credit"
            ? t.activity.toReceivable
            : m.type === "buy_inventory"
              ? t.activity.toInventory
              : m.type === "lend"
                ? t.activity.toLent
                : null;

  // "Cuándo" = registry time (createdAt), exact: "Hoy · 14:32", "8 ago · 09:15".
  const registeredDay = dayLabel(limaDateOf(m.createdAt), today, t.dates);
  return {
    id: m.id,
    title: label,
    concept: m.concept,
    badgeCls: DIR_BADGE[meta.dir],
    initial: label[0],
    author: m.authorName,
    authorInitial: m.authorName[0]?.toUpperCase() ?? "?",
    day: `${registeredDay} · ${limaTimeOf(m.createdAt)}`,
    amountText: amount.text,
    amountCls: amount.cls,
    note,
    voided: m.status === "voided",
  };
}
