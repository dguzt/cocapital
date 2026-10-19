/** A calendar day as "YYYY-MM-DD", in Lima; compares correctly with < and >. */
export type ISODate = string;

/** UI labels are Spanish (Diario/Semanal/Quincenal/Mensual); values English. */
export type Frequency = "daily" | "weekly" | "biweekly" | "monthly";

export const FREQUENCIES: Frequency[] = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
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
 * Steps `n` periods forward from `start`:
 * daily +1d · weekly +7d · biweekly +15d (quincenal) ·
 * monthly +1 month keeping the start's day-of-month as anchor, clamped to the
 * target month's last day (Jan 31 → Feb 28 → Mar 31, anchor preserved).
 */
export function addPeriods(
  start: ISODate,
  frequency: Frequency,
  n: number,
): ISODate {
  const d = toUTC(start);
  switch (frequency) {
    case "daily":
      d.setUTCDate(d.getUTCDate() + n);
      return fromUTC(d);
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7 * n);
      return fromUTC(d);
    case "biweekly":
      d.setUTCDate(d.getUTCDate() + 15 * n);
      return fromUTC(d);
    case "monthly": {
      const anchorDay = d.getUTCDate();
      const totalMonths = d.getUTCMonth() + n;
      const year = d.getUTCFullYear() + Math.floor(totalMonths / 12);
      const month = ((totalMonths % 12) + 12) % 12;
      const day = Math.min(anchorDay, daysInMonth(year, month));
      return fromUTC(new Date(Date.UTC(year, month, day)));
    }
  }
}

/** Whether a cuota is overdue: due strictly before today. */
export function isOverdue(dueDate: ISODate, today: ISODate): boolean {
  return dueDate < today;
}

const SHORT_MONTHS = "ene feb mar abr may jun jul ago sep oct nov dic".split(
  " ",
);

/** "2026-08-08" → "8 ago" (cronograma rows, activity dates). */
export function formatDayMonth(date: ISODate): string {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${SHORT_MONTHS[m - 1]}`;
}

/** Approximate loan length in days, for the annual rate shown as reference. */
export const PERIOD_DAYS: Record<Frequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 15,
  monthly: 30,
};

/** The Lima calendar day a timestamp falls on. */
export function limaDateOf(instant: Date): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
  }).format(instant);
}

/** "14:32" — Lima wall-clock time of a timestamp (24h, compact). */
export function limaTimeOf(instant: Date): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}
