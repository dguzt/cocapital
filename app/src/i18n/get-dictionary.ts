import { type Dictionary, dictionaries } from "@/i18n/dictionaries";
import { getLocale } from "@/i18n/get-locale";

/**
 * The copy for the current request's language, for Server Components.
 * @returns the dictionary
 */
export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}
