"use client";

import { createContext, useContext } from "react";
import { type Dictionary, dictionaries } from "@/i18n/dictionaries";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locale";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/**
 * Makes the request's language available to Client Components.
 * @param locale - the language resolved on the server
 */
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

/**
 * The current language, in a Client Component.
 * @returns the locale
 */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/**
 * The copy for the current language, in a Client Component.
 * @returns the dictionary
 */
export function useDictionary(): Dictionary {
  return dictionaries[useLocale()];
}
