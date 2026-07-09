"use client";
/** UC-304: confirm-the-cuota (D3 #6) — one tap, one dialog, atomic batch. */
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { collectInstallmentAction } from "@/backend/modules/loans/actions";
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

export function CollectButton({
  loanId,
  installmentId,
  number,
  amountCents,
  borrowerName,
}: {
  loanId: string;
  installmentId: string;
  number: number;
  amountCents: number;
  borrowerName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function collect() {
    startTransition(async () => {
      const result = await collectInstallmentAction(loanId, installmentId);
      if (result.ok) {
        setOpen(false);
        toast.success(`Cobro registrado · ${formatCents(result.amount)}`);
        router.refresh();
      } else {
        toast.error(
          result.error === "InstallmentNotCollectable"
            ? "Esta cuota ya fue cobrada."
            : "No se pudo registrar el cobro.",
        );
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Cobrar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar cobro</DialogTitle>
          <DialogDescription>
            {borrowerName} · cuota {number} ·{" "}
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatCents(amountCents)}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={collect} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {pending ? "Registrando…" : "Confirmar cobro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
