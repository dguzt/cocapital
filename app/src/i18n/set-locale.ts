"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, toLocale } from "@/i18n/locale";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Remembers the language the visitor picked.
 * @param value - the chosen locale
 */
export async function setLocale(value: string): Promise<void> {
  const locale = toLocale(value);

  if (!locale) {
    return;
  }

  const cookieStore = await cookies();

  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
}
