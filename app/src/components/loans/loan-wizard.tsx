"use client";
/**
 * UC-302: loan wizard. Fields → LIVE schedule preview (the real engine runs
 * right here — it's pure) → per-cuota amount/date edits (D3 #3: free edit,
 * total floats, drift always visible) → Confirmar.
 */
import { Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Frequency } from "@/lib/dates";
import { todayInLima } from "@/lib/dates";
import { formatCents, solesToCents } from "@/lib/money";

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
};

type Borrower = { id: string; name: string };
type Edit = { amountSoles?: string; dueDate?: string };

export function LoanWizard({ borrowers }: { borrowers: Borrower[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [borrowerId, setBorrowerId] = useState<string>(
    borrowers.length > 0 ? "" : "new",
  );
  const [newName, setNewName] = useState("");
  const [phone, setPhone] = useState("");
  const [capitalSoles, setCapitalSoles] = useState("");
  const [ratePercent, setRatePercent] = useState("");
  const [count, setCount] = useState("4");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [startDate, setStartDate] = useState(todayInLima());
  /** Per-row user edits on top of the generated schedule (D3 #3). */
  const [edits, setEdits] = useState<Record<number, Edit>>({});

  const capital = solesToCents(capitalSoles) ?? 0;
  const rate = Number(ratePercent);

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

  /** The engine's rows with user edits applied; principal share never moves. */
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
        dueDate: edit?.dueDate || i.dueDate,
      };
    });
  }, [base, edits]);

  const scheduled = rows.reduce((a, r) => a + r.amount, 0);
  const drift = base ? scheduled - base.total : 0;

  const borrowerReady =
    borrowerId === "new" ? newName.trim().length > 0 : borrowerId !== "";
  const canConfirm =
    base !== null && borrowerReady && rows.every((r) => r.amount > 0);

  function confirm() {
    if (!base) return;
    startTransition(async () => {
      const result = await createLoanAction({
        borrower:
          borrowerId === "new"
            ? { name: newName, phone: phone || undefined }
            : { id: borrowerId },
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
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Select value={borrowerId} onValueChange={setBorrowerId}>
            <SelectTrigger className="h-12 w-full text-base">
              <SelectValue placeholder="Elige o crea un cliente" />
            </SelectTrigger>
            <SelectContent>
              {borrowers.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
              <SelectItem value="new">+ Nuevo cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {borrowerId === "new" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="newName">Nombre</Label>
              <Input
                id="newName"
                placeholder="Ej. Karina"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono · opcional</Label>
              <Input
                id="phone"
                inputMode="tel"
                placeholder="999 999 999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="capital">Monto (S/)</Label>
            <Input
              id="capital"
              inputMode="decimal"
              placeholder="300"
              value={capitalSoles}
              onChange={(e) => setCapitalSoles(e.target.value)}
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
              onChange={(e) => setRatePercent(e.target.value)}
              className="h-12 font-mono text-lg tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="count"># de cuotas</Label>
            <Input
              id="count"
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="h-12 font-mono text-lg tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label>Frecuencia</Label>
            <Select
              value={frequency}
              onValueChange={(v) => setFrequency(v as Frequency)}
            >
              <SelectTrigger className="h-12 w-full text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        {base && (
          <p className="text-sm text-muted-foreground">
            Total a cobrar:{" "}
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatCents(base.total)}
            </span>{" "}
            · interés{" "}
            <span className="font-mono text-emerald-400 tabular-nums">
              {formatCents(base.interest)}
            </span>
          </p>
        )}
      </section>

      {base && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Cronograma</h2>
            <p
              className={`font-mono text-sm tabular-nums ${drift === 0 ? "text-muted-foreground" : "text-amber-400"}`}
            >
              programado {formatCents(scheduled)} · préstamo{" "}
              {formatCents(base.total)}
              {drift !== 0 && ` (${drift > 0 ? "+" : ""}${formatCents(drift)})`}
            </p>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Puedes ajustar monto y fecha de cada cuota — la diferencia con el
            total siempre se muestra, nunca se oculta.
          </p>
          <ul className="mt-3 divide-y divide-border">
            {rows.map((r) => (
              <li key={r.number} className="flex items-center gap-3 py-2.5">
                <span className="w-14 shrink-0 text-sm font-medium">
                  Cuota {r.number}
                </span>
                <Input
                  type="date"
                  value={r.dueDate}
                  onChange={(e) =>
                    setEdits((prev) => ({
                      ...prev,
                      [r.number]: {
                        ...prev[r.number],
                        dueDate: e.target.value,
                      },
                    }))
                  }
                  className="h-10 flex-1 text-sm"
                />
                <div className="w-28 shrink-0">
                  <Input
                    inputMode="decimal"
                    value={
                      edits[r.number]?.amountSoles ??
                      (r.amount / 100).toFixed(2)
                    }
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [r.number]: {
                          ...prev[r.number],
                          amountSoles: e.target.value,
                        },
                      }))
                    }
                    className="h-10 text-right font-mono text-sm tabular-nums"
                  />
                  <p className="mt-0.5 text-right text-[11px] text-muted-foreground">
                    int. {formatCents(r.interest)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
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
