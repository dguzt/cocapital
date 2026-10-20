"use client";
/**
 * UC-302 · The loan wizard. This file only orchestrates: it holds the state,
 * runs the pure schedule engine CLIENT-SIDE on every keystroke (instant, no
 * backend), and submits. The pieces render themselves.
 */
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ContactView } from "@/backend/modules/contacts/adapters/in/next/contact-view";
import { createLoanAction } from "@/backend/modules/loans/adapters/in/next/loan-actions";
import { Schedule } from "@/backend/modules/loans/domain/schedule";
import type { ScheduledInstallment } from "@/backend/modules/loans/domain/scheduled-installment";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { Button } from "@/components/ui/button";
import { PERIOD_DAYS, todayInLima } from "@/lib/dates";
import { solesToCents } from "@/lib/money";
import { type Edit, ScheduleEditor } from "./schedule-editor";
import { SummaryCard } from "./summary-card";
import { type LoanTerms, TermsStep } from "./terms-step";

export function LoanWizard({ contacts }: { contacts: ContactView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ContactView | null>(null);
  const [terms, setTerms] = useState<LoanTerms>({
    capitalSoles: "",
    ratePercent: "",
    count: "4",
    frequency: "monthly",
    startDate: todayInLima(),
  });
  const [edits, setEdits] = useState<Record<number, Edit>>({});

  const capital = solesToCents(terms.capitalSoles) ?? 0;
  const rate = Number(terms.ratePercent);
  const newName = query.trim();
  const borrowerLabel = selected?.name ?? (newName || null);

  const base = useMemo(() => {
    const r = Schedule.generate({
      capital,
      ratePercent: Number.isFinite(rate) ? rate : -1,
      installmentCount: Number(terms.count),
      frequency: terms.frequency,
      startDate: terms.startDate,
    });
    return r.ok ? r.value : null;
  }, [capital, rate, terms.count, terms.frequency, terms.startDate]);

  /** Engine rows + user edits; principal never moves, interest floats (D3 #3). */
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

  // UC-306: informational annual-interest reference (D3: rate × 365/days).
  const loanDays = PERIOD_DAYS[terms.frequency] * (Number(terms.count) || 0);
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
        frequency: terms.frequency,
        startDate: terms.startDate,
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
      <ContactPicker
        label="Prestatario"
        placeholder="Elegir o crear prestatario"
        contacts={contacts}
        query={query}
        selected={selected}
        onQueryChange={setQuery}
        onSelect={setSelected}
      />

      <TermsStep
        terms={terms}
        onChange={(patch) => setTerms((t) => ({ ...t, ...patch }))}
      />

      <SummaryCard
        total={base?.total ?? null}
        installmentCount={rows.length}
        frequency={terms.frequency}
        annualRef={annualRef}
      />

      {base && (
        <ScheduleEditor
          rows={rows}
          edits={edits}
          loanTotal={base.total}
          onEdit={(number, patch) =>
            setEdits((prev) => ({
              ...prev,
              [number]: { ...prev[number], ...patch },
            }))
          }
        />
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
