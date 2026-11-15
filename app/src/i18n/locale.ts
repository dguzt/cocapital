export const LOCALES = ["es", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

export const LOCALE_COOKIE = "locale";

export const LOCALE_HEADER = "x-locale";

export const LOCALE_PARAM = "l";

/**
 * Reads a locale from untrusted input.
 * @param value - a cookie, header or query value
 * @returns the locale, or null when it is not one we speak
 */
export function toLocale(value: string | null | undefined): Locale | null {
  return LOCALES.find((locale) => locale === value) ?? null;
}

/**
 * Picks the first language of the browser that we speak.
 * @param header - the Accept-Language header
 * @returns that locale, or the default one
 */
export function localeFromAcceptLanguage(header: string | null): Locale {
  const languages = (header ?? "")
    .split(",")
    .map((part) => part.split(";")[0].trim().split("-")[0].toLowerCase());

  for (const language of languages) {
    const locale = toLocale(language);

    if (locale) {
      return locale;
    }
  }

  return DEFAULT_LOCALE;
}
