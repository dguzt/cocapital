"use client";
import { useMemo, useState } from "react";
import { CreditSaleSchedule } from "@/backend/modules/inventory/domain/credit-sale-schedule";
import type { Frequency, ISODate } from "@/lib/dates";
import { solesToCents } from "@/lib/money";
import type { Edit, ScheduleRow } from "./schedule-editor";

/**
 * Equal cuotas for an amount, recalculated on every keystroke, plus the
 * partner's edits on top.
 *
 * @param terms - The amount to split, number of cuotas, frequency and start.
 * @returns The rows, the edits, a way to edit a row, and whether the rows
 *   still add up to the amount.
 */
export function useEditableSchedule(terms: {
  amount: number;
  count: number;
  frequency: Frequency;
  startDate: ISODate;
}) {
  const [edits, setEdits] = useState<Record<number, Edit>>({});

  const base = useMemo(() => {
    const generated = CreditSaleSchedule.generate({
      amount: terms.amount,
      installmentCount: terms.count,
      frequency: terms.frequency,
      startDate: terms.startDate,
    });

    return generated.ok ? generated.value : [];
  }, [terms.amount, terms.count, terms.frequency, terms.startDate]);

  const rows: ScheduleRow[] = useMemo(
    () =>
      base.map((row, index) => {
        const number = index + 1;
        const edit = edits[number];

        return {
          number,
          dueDate: edit?.dueDate ?? row.dueDate,
          amount: edit?.amountSoles
            ? (solesToCents(edit.amountSoles) ?? row.amount)
            : row.amount,
        };
      }),
    [base, edits],
  );

  const addsUp =
    rows.length > 0 &&
    rows.every((row) => row.amount > 0) &&
    rows.reduce((sum, row) => sum + row.amount, 0) === terms.amount;

  function edit(number: number, patch: Edit) {
    setEdits((prev) => ({ ...prev, [number]: { ...prev[number], ...patch } }));
  }

  return { rows, edits, edit, addsUp };
}
