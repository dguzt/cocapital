"use client";
import { Label } from "@/components/ui/label";
import type { Frequency } from "@/lib/dates";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
];

/** Diario · Semanal · Quincenal · Mensual, as chips. */
export function FrequencyPicker({
  value,
  onChange,
}: {
  value: Frequency;
  onChange: (frequency: Frequency) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Frecuencia</Label>
      <div className="flex flex-wrap gap-2">
        {FREQUENCIES.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={value === f.value}
            onClick={() => onChange(f.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              value === f.value
                ? "border-emerald-400 bg-emerald-400/10 text-foreground"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** "mensuales", "semanales"… for a count of cuotas. */
export const FREQUENCY_WORD: Record<Frequency, string> = {
  daily: "diarias",
  weekly: "semanales",
  biweekly: "quincenales",
  monthly: "mensuales",
};
