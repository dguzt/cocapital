"use client";
import { Ban, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { proposeVoidCreditSaleAction } from "@/backend/modules/inventory/adapters/in/next/credit-sale-actions";
import { useGroup } from "@/components/groups/group-context";
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

/** Proposes cancelling a whole credit sale and its cobros (doble confirmación). */
export function VoidCreditSaleButton({
  saleId,
  buyerName,
  item,
  collectedCount,
  collectedCents,
  className,
  label = "Anular",
}: {
  saleId: string;
  buyerName: string;
  item: string;
  collectedCount: number;
  collectedCents: number;
  className?: string;
  label?: string;
}) {
  const { groupId, alone } = useGroup();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function propose() {
    startTransition(async () => {
      const result = await proposeVoidCreditSaleAction(groupId, saleId);
      if (result.ok) {
        setOpen(false);
        toast.success(
          result.applied
            ? "Venta anulada"
            : "Anulación enviada — falta el OK de otro socio",
        );
        router.refresh();
      } else {
        toast.error(
          result.error === "CreditSaleVoided"
            ? "Esta venta ya fue anulada."
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
          <DialogTitle>Anular venta</DialogTitle>
          <DialogDescription>
            {buyerName} · {item}. Se revierte como si nunca hubiera existido: lo
            vendido vuelve al inventario
            {collectedCount > 0 && (
              <>
                {" "}
                y también se anulan {collectedCount} cobro
                {collectedCount > 1 ? "s" : ""} por{" "}
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {formatCents(collectedCents)}
                </span>
              </>
            )}
            .
          </DialogDescription>
        </DialogHeader>
        <p className="text-center text-[11.5px] text-muted-foreground">
          {alone
            ? "Eres el único socio: se aplica al instante y queda en la actividad."
            : "Se aplica cuando otro socio lo apruebe."}
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
            {pending
              ? "Enviando…"
              : alone
                ? "Anular ahora"
                : "Enviar anulación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
