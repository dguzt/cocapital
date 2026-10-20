import type { ISODate } from "@/lib/dates";

/** Tells a real calendar day written as YYYY-MM-DD. */
export class IsoDate {
  private static readonly PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  /**
   * Checks the text is a valid day.
   *
   * @param value - The text to check.
   * @returns True for a real day as YYYY-MM-DD.
   */
  static isValid(value: string): value is ISODate {
    return IsoDate.PATTERN.test(value) && !Number.isNaN(Date.parse(value));
  }
}
