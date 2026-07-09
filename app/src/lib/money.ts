/**
 * Money in CoCapital is ALWAYS integer céntimos (D5): S/ 36.66 = 3666.
 * Never floats — floats can't represent 0.1 and rounding dust becomes
 * real missing céntimos in a loan schedule.
 */
export type Centimos = number;

/** Parse user-entered soles ("36.66", "1,234.5") into céntimos. NaN-safe. */
export function solesToCentimos(input: string | number): Centimos | null {
  const n = typeof input === "number" ? input : Number(input.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Format céntimos for display: 123456 → "S/ 1,234.56". */
export function formatCentimos(c: Centimos): string {
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
export function splitEvenly(total: Centimos, parts: number): Centimos[] {
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
  const result = new Array<Centimos>(parts).fill(base);
  result[parts - 1] += remainder;
  return result;
}
