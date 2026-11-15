import { en } from "@/i18n/dictionaries/en";
import { type Dictionary, es } from "@/i18n/dictionaries/es";
import type { Locale } from "@/i18n/locale";

export type { Dictionary };

export const dictionaries: Record<Locale, Dictionary> = { es, en };
