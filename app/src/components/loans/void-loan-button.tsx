"use client";
/** UC-306: propose to cancel a loan — proposes, never applies (doble confirmación). */
import { Ban, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { proposeVoidLoanAction } from "@/backend/modules/loans/adapters/in/next/loan-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCents } from "@/lib/money";

export function VoidLoanButton({
  loanId,
  borrowerName,
  capitalCents,
  collectedCount,
  className,
  label = "Anular",
}: {
  loanId: string;
  borrowerName: string;
  capitalCents: number;
  collectedCount: number;
  /** Extra classes for the trigger — lets the mobile placement go full-width. */
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function propose() {
    startTransition(async () => {
      const result = await proposeVoidLoanAction(loanId);
      if (result.ok) {
        setOpen(false);
        toast.success("Anulación enviada — falta el OK de tu socio");
        router.refresh();
      } else {
        toast.error(
          result.error === "LoanAlreadyVoided"
            ? "Este préstamo ya fue anulado."
            : result.error === "ChangeAlreadyPending"
              ? "Ya hay una anulación esperando el OK."
              : "No se pudo enviar la anulación.",
        );
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={`text-destructive ${className ?? ""}`}
        >
          <Ban className="size-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Anular préstamo</DialogTitle>
          <DialogDescription>
            {borrowerName} ·{" "}
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatCents(capitalCents)}
            </span>
            . Se revierte como si nunca hubiera existido: el capital vuelve a
            caja
            {collectedCount > 0
              ? ` y se deshacen sus ${collectedCount} cobro${collectedCount > 1 ? "s" : ""}`
              : ""}
            .
          </DialogDescription>
        </DialogHeader>
        <p className="text-center text-[11.5px] text-muted-foreground">
          Se aplica cuando tu socio lo apruebe (doble confirmación).
        </p>
        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={propose} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Ban className="size-4" />
            )}
            {pending ? "Enviando…" : "Enviar anulación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
