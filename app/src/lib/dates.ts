/**
 * Dates in CoCapital are plain calendar dates ("YYYY-MM-DD"), no time, no tz
 * stored. "Today" is the America/Lima calendar day (D5/A-1). ISO strings
 * compare correctly with < > ===.
 */
export type ISODate = string;

export type Frequency = "diario" | "semanal" | "quincenal" | "mensual";

export const FREQUENCIES: Frequency[] = [
  "diario",
  "semanal",
  "quincenal",
  "mensual",
];

/** Today as a calendar date in Lima, regardless of server timezone. */
export function todayInLima(): ISODate {
  // en-CA locale formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
  }).format(new Date());
}

function toUTC(date: ISODate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number): number {
  // day 0 of next month = last day of this month.
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Step `n` periods forward from `start` (D5/A-2):
 * diario +1d · semanal +7d · quincenal +15d ·
 * mensual +1 month keeping the start's day-of-month as anchor, clamped to the
 * target month's last day (Ene 31 → Feb 28 → Mar 31, anchor preserved).
 */
export function addPeriods(
  start: ISODate,
  frequency: Frequency,
  n: number,
): ISODate {
  const d = toUTC(start);
  switch (frequency) {
    case "diario":
      d.setUTCDate(d.getUTCDate() + n);
      return fromUTC(d);
    case "semanal":
      d.setUTCDate(d.getUTCDate() + 7 * n);
      return fromUTC(d);
    case "quincenal":
      d.setUTCDate(d.getUTCDate() + 15 * n);
      return fromUTC(d);
    case "mensual": {
      const anchorDay = d.getUTCDate();
      const totalMonths = d.getUTCMonth() + n;
      const year = d.getUTCFullYear() + Math.floor(totalMonths / 12);
      const month = ((totalMonths % 12) + 12) % 12;
      const day = Math.min(anchorDay, daysInMonth(year, month));
      return fromUTC(new Date(Date.UTC(year, month, day)));
    }
  }
}

/** Vencida is DERIVED, never stored (D3 #10): due strictly before today. */
export function isVencida(dueDate: ISODate, today: ISODate): boolean {
  return dueDate < today;
}
