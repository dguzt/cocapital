"use client";

import { useDictionary, useLocale } from "@/i18n/i18n-provider";
import { LOCALE_PARAM, LOCALES } from "@/i18n/locale";
import { cn } from "@/lib/utils";

/**
 * The always-visible ES · EN toggle. The proxy remembers the ?l= it links to.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useDictionary();

  return (
    <nav
      aria-label={t.language.label}
      className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 font-mono text-[11px] font-semibold"
    >
      {LOCALES.map((option) => (
        // <a>, not <Link>: prefetching ?l= would switch the language without a click
        <a
          key={option}
          href={`?${LOCALE_PARAM}=${option}`}
          lang={option}
          title={t.language[option]}
          aria-label={t.language[option]}
          aria-current={option === locale ? "true" : undefined}
          className={cn(
            "rounded-md px-2 py-1 uppercase transition-colors",
            option === locale
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option}
        </a>
      ))}
    </nav>
  );
}
