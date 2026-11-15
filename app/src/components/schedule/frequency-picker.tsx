"use client";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/i18n/i18n-provider";
import type { Frequency } from "@/lib/dates";

const FREQUENCIES: Frequency[] = ["daily", "weekly", "biweekly", "monthly"];

/** Diario · Semanal · Quincenal · Mensual, as chips. */
export function FrequencyPicker({
  value,
  onChange,
}: {
  value: Frequency;
  onChange: (frequency: Frequency) => void;
}) {
  const t = useDictionary().frequency;

  return (
    <div className="space-y-2">
      <Label>{t.label}</Label>
      <div className="flex flex-wrap gap-2">
        {FREQUENCIES.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={value === f}
            onClick={() => onChange(f)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              value === f
                ? "border-emerald-400 bg-emerald-400/10 text-foreground"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.names[f]}
          </button>
        ))}
      </div>
    </div>
  );
}
