import { headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_HEADER,
  type Locale,
  toLocale,
} from "@/i18n/locale";

/**
 * The language of the current request, as resolved by the proxy.
 * @returns the request's locale
 */
export async function getLocale(): Promise<Locale> {
  const requestHeaders = await headers();

  return toLocale(requestHeaders.get(LOCALE_HEADER)) ?? DEFAULT_LOCALE;
}
