"use client";
/** Total · cuotas · "interés anual ~X%" (UC-306, informational only). */
import type { Frequency } from "@/lib/dates";
import { formatCents } from "@/lib/money";

const FREQUENCY_WORD: Record<Frequency, string> = {
  daily: "diarias",
  weekly: "semanales",
  biweekly: "quincenales",
  monthly: "mensuales",
};

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
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Resumen
      </p>
      <p className="mt-1.5 text-[15px]">
        {total === null ? (
          <span className="text-muted-foreground">
            Completa monto e interés para ver el total.
          </span>
        ) : (
          <>
            Total{" "}
            <span className="font-mono font-semibold tabular-nums">
              {formatCents(total)}
            </span>{" "}
            · {installmentCount} cuota{installmentCount === 1 ? "" : "s"}{" "}
            {FREQUENCY_WORD[frequency]}
            {annualRef !== null && (
              <span className="text-muted-foreground">
                {" "}
                · interés anual ~{annualRef}%
              </span>
            )}
          </>
        )}
      </p>
    </div>
  );
}
