"use client";
/** Deshacer cobro (UC-402) — proposed from the cuota, applied on the socio's OK. */
import { Ban, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { proposeVoidAction } from "@/backend/modules/movements/adapters/in/next/movement-actions";
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

export function UndoCollectionButton({
  repayMovementId,
  number,
  amountCents,
  borrowerName,
}: {
  repayMovementId: string;
  number: number;
  amountCents: number;
  borrowerName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function undo() {
    startTransition(async () => {
      const result = await proposeVoidAction(repayMovementId);
      if (result.ok) {
        setOpen(false);
        toast.success("Deshacer cobro enviado — falta el OK de tu socio");
        router.refresh();
      } else {
        toast.error(
          result.error === "ChangeAlreadyPending"
            ? "Ya hay un cambio esperando el OK."
            : "No se pudo enviar la anulación.",
        );
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-destructive">
          Anular
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Anular cobro</DialogTitle>
          <DialogDescription>
            {borrowerName} · cuota {number} ·{" "}
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatCents(amountCents)}
            </span>
            . La cuota vuelve a pendiente y podrás volver a cobrarla.
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
          <Button onClick={undo} disabled={pending}>
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
