"use client";
/** The loan's terms: capital · interés · # de cuotas · frecuencia · inicio. */
import { FrequencyPicker } from "@/components/schedule/frequency-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/i18n/i18n-provider";
import type { Frequency, ISODate } from "@/lib/dates";
import { sanitizeIntInput, sanitizeMoneyInput } from "@/lib/money";

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
  const t = useDictionary().loanWizard;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="capital">{t.amount}</Label>
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
          <Label htmlFor="rate">{t.rate}</Label>
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
        <Label htmlFor="count">{t.count}</Label>
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

      <FrequencyPicker
        value={terms.frequency}
        onChange={(frequency) => onChange({ frequency })}
      />

      <div className="space-y-2">
        <Label htmlFor="start">{t.startDate}</Label>
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
