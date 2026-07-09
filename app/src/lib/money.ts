/**
 * Money in CoCapital is ALWAYS integer cents (D5): S/ 36.66 = 3666.
 * Never floats — floats can't represent 0.1 and rounding dust becomes
 * real missing cents in a loan schedule.
 */
export type Cents = number;

/** Parse user-entered soles ("36.66", "1,234.5") into cents. NaN-safe. */
export function solesToCents(input: string | number): Cents | null {
  const n = typeof input === "number" ? input : Number(input.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Format cents for display: 123456 → "S/ 1,234.56". */
export function formatCents(c: Cents): string {
  const sign = c < 0 ? "-" : "";
  const abs = Math.abs(c);
  const soles = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const cents = (abs % 100).toString().padStart(2, "0");
  return `${sign}S/ ${soles}.${cents}`;
}

/**
 * Split a total into `parts` near-equal integer amounts.
 * Each part = floor(total/parts); the LAST part absorbs the remainder (D5).
 * Invariant: sum(result) === total, result.length === parts.
 */
export function splitEvenly(total: Cents, parts: number): Cents[] {
  if (!Number.isInteger(total) || total < 0)
    throw new Error(
      `splitEvenly: total must be a non-negative integer, got ${total}`,
    );
  if (!Number.isInteger(parts) || parts < 1)
    throw new Error(
      `splitEvenly: parts must be a positive integer, got ${parts}`,
    );
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  const result = new Array<Cents>(parts).fill(base);
  result[parts - 1] += remainder;
  return result;
}

/**
 * Keystroke-level guard for money fields: keeps only digits and ONE decimal
 * point, max 2 decimals. Letters never appear in the input at all.
 */
export function sanitizeMoneyInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [integer, ...decimals] = cleaned.split(".");
  if (decimals.length === 0) return integer;
  return `${integer}.${decimals.join("").slice(0, 2)}`;
}

/** Same idea for count fields: digits only. */
export function sanitizeIntInput(raw: string): string {
  return raw.replace(/\D/g, "");
}
