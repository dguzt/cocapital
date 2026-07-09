"use client";
/**
 * UC-302: loan wizard, per the main prototype (CoCapital.dc.html):
 * Prestatario combobox (search-or-create) · monto+interés · # de cuotas ·
 * frequency pills · Resumen card (with "interés anual ~X%", UC-306) ·
 * "Cronograma · edítalo si quieres" (amounts editable, dates tappable) ·
 * "Programado vs Préstamo · coincide ✓" footer.
 * The schedule runs the pure engine CLIENT-SIDE — instant, no backend.
 */
import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createLoanAction } from "@/backend/modules/loans/actions";
import {
  generateSchedule,
  type ScheduledInstallment,
} from "@/backend/modules/loans/domain/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Frequency, ISODate } from "@/lib/dates";
import { formatDayMonth, PERIOD_DAYS, todayInLima } from "@/lib/dates";
import {
  formatCents,
  sanitizeIntInput,
  sanitizeMoneyInput,
  solesToCents,
} from "@/lib/money";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
];
const FREQUENCY_WORD: Record<Frequency, string> = {
  daily: "diarias",
  weekly: "semanales",
  biweekly: "quincenales",
  monthly: "mensuales",
};

type Borrower = { id: string; name: string };
type Edit = { amountSoles?: string; dueDate?: ISODate };

/** Prototype cronograma date: quiet text, tap to edit (D3 §3 kept). */
function TappableDate({
  value,
  onChange,
}: {
  value: ISODate;
  onChange: (d: ISODate) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <Input
        type="date"
        autoFocus
        defaultValue={value}
        onBlur={(e) => {
          if (e.target.value) onChange(e.target.value);
          setEditing(false);
        }}
        className="h-9 w-36 text-sm"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded px-1 py-0.5 font-mono text-[13px] text-muted-foreground hover:bg-secondary hover:text-foreground"
      title="Tocar para cambiar la fecha"
    >
      {formatDayMonth(value)}
    </button>
  );
}

export function LoanWizard({ borrowers }: { borrowers: Borrower[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Prestatario: existing id, or the free-typed query as a new name.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Borrower | null>(null);

  const [capitalSoles, setCapitalSoles] = useState("");
  const [ratePercent, setRatePercent] = useState("");
  const [count, setCount] = useState("4");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [startDate, setStartDate] = useState(todayInLima());
  const [edits, setEdits] = useState<Record<number, Edit>>({});

  const capital = solesToCents(capitalSoles) ?? 0;
  const rate = Number(ratePercent);
  const filtered = borrowers.filter((b) =>
    b.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const newName = query.trim();
  const borrowerLabel = selected?.name ?? (newName || null);

  const base = useMemo(() => {
    const r = generateSchedule({
      capital,
      ratePercent: Number.isFinite(rate) ? rate : -1,
      installmentCount: Number(count),
      frequency,
      startDate,
    });
    return r.ok ? r.value : null;
  }, [capital, rate, count, frequency, startDate]);

  /** Engine rows + user edits; principal never moves, interest floats (D3 §3). */
  const rows: ScheduledInstallment[] = useMemo(() => {
    if (!base) return [];
    return base.installments.map((i) => {
      const edit = edits[i.number];
      const amount = edit?.amountSoles
        ? (solesToCents(edit.amountSoles) ?? i.amount)
        : i.amount;
      return {
        ...i,
        amount,
        interest: amount - i.principal,
        dueDate: edit?.dueDate ?? i.dueDate,
      };
    });
  }, [base, edits]);

  const scheduled = rows.reduce((a, r) => a + r.amount, 0);
  const drift = base ? scheduled - base.total : 0;

  // UC-306: informational annual-interest reference (D3: rate × 365/days).
  const loanDays = PERIOD_DAYS[frequency] * (Number(count) || 0);
  const annualRef =
    base && loanDays > 0 ? Math.round(rate * (365 / loanDays)) : null;

  const canConfirm =
    base !== null && borrowerLabel !== null && rows.every((r) => r.amount > 0);

  function confirm() {
    if (!base || !borrowerLabel) return;
    startTransition(async () => {
      const result = await createLoanAction({
        borrower: selected ? { id: selected.id } : { name: newName },
        capital: base.capital,
        rateBps: Math.round(rate * 100),
        frequency,
        startDate,
        installments: rows,
      });
      if (result.ok) {
        toast.success("Préstamo creado");
        router.push(`/prestamos/${result.loanId}`);
      } else {
        toast.error("No se pudo crear el préstamo. Revisa los datos.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Prestatario — combobox, search-or-create */}
      <div className="space-y-2">
        <Label>Prestatario</Label>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className={`flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-4 text-base ${borrowerLabel ? "" : "text-muted-foreground"}`}
        >
          {borrowerLabel ?? "Elegir o crear prestatario"}
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
        {pickerOpen && (
          <div className="space-y-1 rounded-xl border border-border bg-card p-2">
            <Input
              autoFocus
              placeholder="Buscar o escribir un nombre nuevo"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              className="h-11 text-base"
            />
            <ul className="max-h-44 overflow-auto">
              {filtered.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(b);
                      setQuery(b.name);
                      setPickerOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[15px] hover:bg-secondary"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                      {b.name[0]}
                    </span>
                    {b.name}
                  </button>
                </li>
              ))}
              {newName &&
                !filtered.some(
                  (b) => b.name.toLowerCase() === newName.toLowerCase(),
                ) && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(false)}
                      className="w-full rounded-lg px-2 py-2 text-left text-[15px] text-emerald-400 hover:bg-secondary"
                    >
                      + Crear "{newName}"
                    </button>
                  </li>
                )}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="capital">Monto (S/)</Label>
          <Input
            id="capital"
            inputMode="decimal"
            placeholder="300"
            value={capitalSoles}
            onChange={(e) =>
              setCapitalSoles(sanitizeMoneyInput(e.target.value))
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
            value={ratePercent}
            onChange={(e) => setRatePercent(sanitizeMoneyInput(e.target.value))}
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
          value={count}
          onChange={(e) => setCount(sanitizeIntInput(e.target.value))}
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
              onClick={() => setFrequency(f.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                frequency === f.value
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
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-12 text-base"
        />
      </div>

      {/* Resumen card */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Resumen
        </p>
        <p className="mt-1.5 text-[15px]">
          {base ? (
            <>
              Total{" "}
              <span className="font-mono font-semibold tabular-nums">
                {formatCents(base.total)}
              </span>{" "}
              · {rows.length} cuota{rows.length === 1 ? "" : "s"}{" "}
              {FREQUENCY_WORD[frequency]}
              {annualRef !== null && (
                <span className="text-muted-foreground">
                  {" "}
                  · interés anual ~{annualRef}%
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">
              Completa monto e interés para ver el total.
            </span>
          )}
        </p>
      </div>

      {/* Cronograma */}
      {base && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cronograma · edítalo si quieres
          </p>
          <ul className="mt-1 divide-y divide-border">
            {rows.map((r) => (
              <li key={r.number} className="flex items-center gap-3 py-2.5">
                <span className="w-16 shrink-0 text-[15px] font-semibold">
                  Cuota {r.number}
                </span>
                <span className="flex-1">
                  <TappableDate
                    value={r.dueDate}
                    onChange={(d) =>
                      setEdits((prev) => ({
                        ...prev,
                        [r.number]: { ...prev[r.number], dueDate: d },
                      }))
                    }
                  />
                </span>
                <Input
                  inputMode="decimal"
                  value={
                    edits[r.number]?.amountSoles ?? (r.amount / 100).toFixed(2)
                  }
                  onChange={(e) =>
                    setEdits((prev) => ({
                      ...prev,
                      [r.number]: {
                        ...prev[r.number],
                        amountSoles: sanitizeMoneyInput(e.target.value),
                      },
                    }))
                  }
                  className="h-11 w-28 text-right font-mono text-[15px] tabular-nums"
                />
              </li>
            ))}
          </ul>
          <p
            className={`mt-2 border-t border-border pt-3 text-center font-mono text-[13px] tabular-nums ${
              drift === 0 ? "text-muted-foreground" : "text-amber-400"
            }`}
          >
            Programado {formatCents(scheduled)} · Préstamo{" "}
            {formatCents(base.total)} ·{" "}
            {drift === 0 ? (
              <span className="text-emerald-400">coincide ✓</span>
            ) : (
              `difiere ${drift > 0 ? "+" : ""}${formatCents(drift)}`
            )}
          </p>
        </div>
      )}

      <Button
        className="h-13 w-full text-base"
        disabled={!canConfirm || pending}
        onClick={confirm}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Creando préstamo…" : "Confirmar préstamo"}
      </Button>
    </div>
  );
}
