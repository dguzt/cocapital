"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { replanCreditSaleAction } from "@/backend/modules/inventory/adapters/in/next/credit-sale-actions";
import { useGroup } from "@/components/groups/group-context";
import { FrequencyPicker } from "@/components/schedule/frequency-picker";
import { ScheduleEditor } from "@/components/schedule/schedule-editor";
import { useEditableSchedule } from "@/components/schedule/use-editable-schedule";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/i18n/i18n-provider";
import { type Frequency, todayInLima } from "@/lib/dates";
import { formatCents, sanitizeIntInput } from "@/lib/money";

/** Cambiar plan: rewrite the pending cuotas so they still add up to what is owed. */
export function ReplanButton({
  saleId,
  pendingCents,
  pendingCount,
  frequency: initialFrequency,
}: {
  saleId: string;
  pendingCents: number;
  pendingCount: number;
  frequency: Frequency;
}) {
  const { groupId } = useGroup();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [count, setCount] = useState(String(pendingCount));
  const [frequency, setFrequency] = useState<Frequency>(initialFrequency);
  const [startDate, setStartDate] = useState(todayInLima());
  const t = useDictionary().replan;

  const schedule = useEditableSchedule({
    amount: pendingCents,
    count: Number(count),
    frequency,
    startDate,
  });

  function save() {
    startTransition(async () => {
      const result = await replanCreditSaleAction(
        groupId,
        saleId,
        schedule.rows.map(({ dueDate, amount }) => ({ dueDate, amount })),
      );
      if (result.ok) {
        setOpen(false);
        toast.success(t.changed(result.fromCount, result.toCount));
        router.refresh();
      } else {
        toast.error(
          result.error === "ScheduleMismatch" ? t.mismatch : t.failed,
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {t.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>
            {t.bodyStart}{" "}
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatCents(pendingCents)}
            </span>
            {t.bodyEnd}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="replan-count">{t.count}</Label>
            <Input
              id="replan-count"
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(sanitizeIntInput(e.target.value))}
              className="h-12 font-mono text-lg tabular-nums"
            />
          </div>
          <FrequencyPicker value={frequency} onChange={setFrequency} />
          <div className="space-y-2">
            <Label htmlFor="replan-start">{t.startDate}</Label>
            <Input
              id="replan-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-12 text-base"
            />
          </div>
          {schedule.rows.length > 0 && (
            <ScheduleEditor
              rows={schedule.rows}
              edits={schedule.edits}
              total={pendingCents}
              totalLabel={t.totalLabel}
              onEdit={schedule.edit}
            />
          )}
          <p className="text-center text-[11.5px] text-muted-foreground">
            {t.note}
          </p>
          <Button
            className="h-12 w-full"
            disabled={!schedule.addsUp || pending}
            onClick={save}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? t.saving : t.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
