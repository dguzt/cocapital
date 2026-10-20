"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { replanCreditSaleAction } from "@/backend/modules/inventory/adapters/in/next/credit-sale-actions";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [count, setCount] = useState(String(pendingCount));
  const [frequency, setFrequency] = useState<Frequency>(initialFrequency);
  const [startDate, setStartDate] = useState(todayInLima());

  const schedule = useEditableSchedule({
    amount: pendingCents,
    count: Number(count),
    frequency,
    startDate,
  });

  function save() {
    startTransition(async () => {
      const result = await replanCreditSaleAction(
        saleId,
        schedule.rows.map(({ dueDate, amount }) => ({ dueDate, amount })),
      );
      if (result.ok) {
        setOpen(false);
        toast.success(
          `Plan cambiado · ${result.fromCount} → ${result.toCount} cuotas`,
        );
        router.refresh();
      } else {
        toast.error(
          result.error === "ScheduleMismatch"
            ? "Las cuotas no suman lo pendiente."
            : "No se pudo cambiar el plan.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Cambiar plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cambiar plan</DialogTitle>
          <DialogDescription>
            Reparte lo pendiente,{" "}
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatCents(pendingCents)}
            </span>
            , en nuevas cuotas. Las ya cobradas no cambian.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="replan-count"># de cuotas</Label>
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
            <Label htmlFor="replan-start">Fecha de inicio</Label>
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
              totalLabel="Pendiente"
              onEdit={schedule.edit}
            />
          )}
          <p className="text-center text-[11.5px] text-muted-foreground">
            No necesita el OK de tu socio; queda en la actividad.
          </p>
          <Button
            className="h-12 w-full"
            disabled={!schedule.addsUp || pending}
            onClick={save}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? "Guardando…" : "Guardar plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
