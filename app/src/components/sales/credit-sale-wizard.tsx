"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ContactView } from "@/backend/modules/contacts/adapters/in/next/contact-view";
import { createCreditSaleAction } from "@/backend/modules/inventory/adapters/in/next/credit-sale-actions";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { useGroup } from "@/components/groups/group-context";
import { FrequencyPicker } from "@/components/schedule/frequency-picker";
import { ScheduleEditor } from "@/components/schedule/schedule-editor";
import { useEditableSchedule } from "@/components/schedule/use-editable-schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/i18n/i18n-provider";
import { type Frequency, todayInLima } from "@/lib/dates";
import {
  formatCents,
  sanitizeIntInput,
  sanitizeMoneyInput,
  solesToCents,
} from "@/lib/money";

/** Venta en cuotas, all in one screen like Nuevo préstamo. */
export function CreditSaleWizard({ contacts }: { contacts: ContactView[] }) {
  const { groupId, href } = useGroup();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const copy = useDictionary();
  const t = copy.creditSaleWizard;

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ContactView | null>(null);
  const [item, setItem] = useState("");
  const [priceSoles, setPriceSoles] = useState("");
  const [costSoles, setCostSoles] = useState("");
  const [downSoles, setDownSoles] = useState("");
  const [count, setCount] = useState("4");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [startDate, setStartDate] = useState(todayInLima());

  const price = solesToCents(priceSoles) ?? 0;
  const cost = costSoles.trim() ? solesToCents(costSoles) : null;
  const downPayment = solesToCents(downSoles) ?? 0;
  const toCollect = price - downPayment;
  const newName = query.trim();
  const buyerLabel = selected?.name ?? (newName || null);

  const schedule = useEditableSchedule({
    amount: toCollect,
    count: Number(count),
    frequency,
    startDate,
  });

  const margin = useMemo(
    () => (cost !== null && price > 0 ? price - cost : null),
    [cost, price],
  );

  const canConfirm =
    schedule.rows.length > 0 &&
    schedule.addsUp &&
    buyerLabel !== null &&
    item.trim() !== "" &&
    downPayment < price;

  function confirm() {
    if (!buyerLabel) return;
    startTransition(async () => {
      const result = await createCreditSaleAction(groupId, {
        buyer: selected ? { id: selected.id } : { name: newName },
        item,
        price,
        cost,
        downPayment,
        frequency,
        startDate,
        installments: schedule.rows.map(({ dueDate, amount }) => ({
          dueDate,
          amount,
        })),
      });
      if (result.ok) {
        toast.success(t.saved);
        router.push(href(`/ventas/${result.saleId}`));
      } else {
        toast.error(t.errors[result.error] ?? t.genericError);
      }
    });
  }

  return (
    <div className="space-y-5">
      <ContactPicker
        label={t.buyer}
        placeholder={t.buyerPlaceholder}
        contacts={contacts}
        query={query}
        selected={selected}
        onQueryChange={setQuery}
        onSelect={setSelected}
      />

      <div className="space-y-2">
        <Label htmlFor="item">{t.item}</Label>
        <Input
          id="item"
          maxLength={80}
          placeholder={t.itemPlaceholder}
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className="h-12 text-base"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="price">{t.price}</Label>
          <Input
            id="price"
            inputMode="decimal"
            placeholder="100"
            value={priceSoles}
            onChange={(e) => setPriceSoles(sanitizeMoneyInput(e.target.value))}
            className="h-12 font-mono text-lg tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost">{t.cost}</Label>
          <Input
            id="cost"
            inputMode="decimal"
            placeholder="60"
            value={costSoles}
            onChange={(e) => setCostSoles(sanitizeMoneyInput(e.target.value))}
            className="h-12 font-mono text-lg tabular-nums"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="down">{t.down}</Label>
          <Input
            id="down"
            inputMode="decimal"
            placeholder="0"
            value={downSoles}
            onChange={(e) => setDownSoles(sanitizeMoneyInput(e.target.value))}
            className="h-12 font-mono text-lg tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="count">{t.count}</Label>
          <Input
            id="count"
            inputMode="numeric"
            placeholder="4"
            value={count}
            onChange={(e) => setCount(sanitizeIntInput(e.target.value))}
            className="h-12 font-mono text-lg tabular-nums"
          />
        </div>
      </div>

      <FrequencyPicker value={frequency} onChange={setFrequency} />

      <div className="space-y-2">
        <Label htmlFor="start">{t.startDate}</Label>
        <Input
          id="start"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-12 text-base"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t.summary}
        </p>
        <p className="mt-1.5 text-[15px]">
          {schedule.rows.length === 0 ? (
            <span className="text-muted-foreground">{t.fillIn}</span>
          ) : (
            <>
              {t.toCollect}{" "}
              <span className="font-mono font-semibold tabular-nums">
                {formatCents(toCollect)}
              </span>{" "}
              ·{" "}
              {copy.frequency.installmentCount(schedule.rows.length, frequency)}
              {margin !== null && (
                <span className="text-muted-foreground">
                  {" "}
                  · {t.margin(formatCents(margin))}
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {schedule.rows.length > 0 && (
        <ScheduleEditor
          rows={schedule.rows}
          edits={schedule.edits}
          total={toCollect}
          totalLabel={t.toCollect}
          onEdit={schedule.edit}
        />
      )}

      <Button
        className="h-13 w-full text-base"
        disabled={!canConfirm || pending}
        onClick={confirm}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? t.saving : t.confirm}
      </Button>
    </div>
  );
}
