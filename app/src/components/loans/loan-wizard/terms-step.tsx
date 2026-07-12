"use client";
/** The loan's terms: capital · interés · # de cuotas · frecuencia · inicio. */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Frequency, ISODate } from "@/lib/dates";
import { sanitizeIntInput, sanitizeMoneyInput } from "@/lib/money";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
];

export type LoanTerms = {
  capitalSoles: string;
  ratePercent: string;
  count: string;
  frequency: Frequency;
  startDate: ISODate;
};

export function TermsStep({
  terms,
  onChange,
}: {
  terms: LoanTerms;
  onChange: (patch: Partial<LoanTerms>) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="capital">Monto (S/)</Label>
          <Input
            id="capital"
            inputMode="decimal"
            placeholder="300"
            value={terms.capitalSoles}
            onChange={(e) =>
              onChange({ capitalSoles: sanitizeMoneyInput(e.target.value) })
            }
            className="h-12 font-mono text-lg tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate">Interés total (%)</Label>
          <Input
            id="rate"
            inputMode="decimal"
            placeholder="10"
            value={terms.ratePercent}
            onChange={(e) =>
              onChange({ ratePercent: sanitizeMoneyInput(e.target.value) })
            }
            className="h-12 font-mono text-lg tabular-nums"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="count"># de cuotas</Label>
        <Input
          id="count"
          inputMode="numeric"
          placeholder="4"
          value={terms.count}
          onChange={(e) =>
            onChange({ count: sanitizeIntInput(e.target.value) })
          }
          className="h-12 font-mono text-lg tabular-nums"
        />
      </div>

      <div className="space-y-2">
        <Label>Frecuencia</Label>
        <div className="flex flex-wrap gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onChange({ frequency: f.value })}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                terms.frequency === f.value
                  ? "border-emerald-400 bg-emerald-400/10 text-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="start">Fecha de inicio</Label>
        <Input
          id="start"
          type="date"
          value={terms.startDate}
          onChange={(e) => onChange({ startDate: e.target.value })}
          className="h-12 text-base"
        />
      </div>
    </>
  );
}
