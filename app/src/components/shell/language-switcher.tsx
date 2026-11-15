"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useDictionary, useLocale } from "@/i18n/i18n-provider";
import { LOCALE_PARAM, LOCALES, type Locale } from "@/i18n/locale";
import { setLocale } from "@/i18n/set-locale";
import { cn } from "@/lib/utils";

/**
 * The always-visible ES · EN toggle; the choice is remembered.
 * @param className - extra classes for the wrapper
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useDictionary();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (next: Locale) => {
    if (next === locale) {
      return;
    }

    startTransition(async () => {
      await setLocale(next);

      const url = new URL(window.location.href);
      url.searchParams.delete(LOCALE_PARAM);

      router.replace(`${url.pathname}${url.search}`);
      router.refresh();
    });
  };

  return (
    <fieldset
      aria-label={t.language.label}
      disabled={pending}
      className={cn(
        "inline-flex min-w-0 items-center rounded-lg border border-border bg-card p-0.5 font-mono text-[11px] font-semibold",
        className,
      )}
    >
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          title={t.language[option]}
          aria-pressed={option === locale}
          onClick={() => choose(option)}
          className={cn(
            "rounded-md px-2 py-1 uppercase transition-colors",
            option === locale
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option}
        </button>
      ))}
    </fieldset>
  );
}
