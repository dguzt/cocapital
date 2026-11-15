"use client";
import { useDictionary } from "@/i18n/i18n-provider";
/** Total · cuotas · "interés anual ~X%" (UC-306, informational only). */
import type { Frequency } from "@/lib/dates";
import { formatCents } from "@/lib/money";

export function SummaryCard({
  total,
  installmentCount,
  frequency,
  annualRef,
}: {
  total: number | null;
  installmentCount: number;
  frequency: Frequency;
  annualRef: number | null;
}) {
  const copy = useDictionary();
  const t = copy.loanWizard;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t.summary}
      </p>
      <p className="mt-1.5 text-[15px]">
        {total === null ? (
          <span className="text-muted-foreground">{t.fillIn}</span>
        ) : (
          <>
            {t.total}{" "}
            <span className="font-mono font-semibold tabular-nums">
              {formatCents(total)}
            </span>{" "}
            · {copy.frequency.installmentCount(installmentCount, frequency)}
            {annualRef !== null && (
              <span className="text-muted-foreground">
                {" "}
                · {t.annual(annualRef)}
              </span>
            )}
          </>
        )}
      </p>
    </div>
  );
}
