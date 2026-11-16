import { type ISODate, isCalendarDate } from "@/lib/dates";

/** Tells a real calendar day written as YYYY-MM-DD. */
export class IsoDate {
  /**
   * Checks the text is a valid day.
   *
   * @param value - The text to check.
   * @returns True for a real day as YYYY-MM-DD.
   */
  static isValid(value: string): value is ISODate {
    return isCalendarDate(value);
  }
}
