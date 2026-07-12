"use client";
/**
 * "Cronograma · edítalo si quieres" (D3 #3: free edit, the total floats).
 * Editing a cuota does NOT redistribute the others — instead the drift footer
 * shows honestly whether what's scheduled still adds up to the loan.
 * Nothing is committed yet: this only exists before the loan is created.
 */
import { useState } from "react";
import type { ScheduledInstallment } from "@/backend/modules/loans/domain/schedule";
import { Input } from "@/components/ui/input";
import type { ISODate } from "@/lib/dates";
import { formatDayMonth } from "@/lib/dates";
import { formatCents, sanitizeMoneyInput } from "@/lib/money";

export type Edit = { amountSoles?: string; dueDate?: ISODate };

/** Quiet text; tap to edit. */
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

export function ScheduleEditor({
  rows,
  edits,
  loanTotal,
  onEdit,
}: {
  rows: ScheduledInstallment[];
  edits: Record<number, Edit>;
  loanTotal: number;
  onEdit: (number: number, patch: Edit) => void;
}) {
  const scheduled = rows.reduce((a, r) => a + r.amount, 0);
  const drift = scheduled - loanTotal;

  return (
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
                onChange={(d) => onEdit(r.number, { dueDate: d })}
              />
            </span>
            <Input
              inputMode="decimal"
              value={
                edits[r.number]?.amountSoles ?? (r.amount / 100).toFixed(2)
              }
              onChange={(e) =>
                onEdit(r.number, {
                  amountSoles: sanitizeMoneyInput(e.target.value),
                })
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
        Programado {formatCents(scheduled)} · Préstamo {formatCents(loanTotal)}{" "}
        ·{" "}
        {drift === 0 ? (
          <span className="text-emerald-400">coincide ✓</span>
        ) : (
          `difiere ${drift > 0 ? "+" : ""}${formatCents(drift)}`
        )}
      </p>
    </div>
  );
}
