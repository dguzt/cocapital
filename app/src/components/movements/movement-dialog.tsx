"use client";
/**
 * Movement detail (E4): edit (goes pending), void (goes pending), and the
 * immutable history. Loan-linked movements are read-only here.
 */
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  getMovementHistoryAction,
  proposeEditAction,
  proposeVoidAction,
} from "@/backend/modules/movements/actions";
import type { ChangeHistoryItem } from "@/backend/modules/movements/changes-data";
import type { LedgerMovement } from "@/backend/modules/movements/data";
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
import { formatCents, sanitizeMoneyInput } from "@/lib/money";
import { MOVEMENT_META } from "./movement-meta";

const ERROR_TEXT: Record<string, string> = {
  ChangeAlreadyPending: "Ya hay un cambio esperando el OK de tu socio.",
  SystemMovement:
    "Este movimiento pertenece a un préstamo — corrígelo desde el préstamo.",
  MovementVoided: "Este movimiento ya fue anulado.",
  InvalidAmount: "Ingresa un monto válido.",
  InvalidCost: "El costo no es válido.",
};

export function MovementDialog({
  movement,
  hasPending,
  children,
}: {
  movement: LedgerMovement;
  hasPending: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [cost, setCost] = useState("");
  const [history, setHistory] = useState<ChangeHistoryItem[] | null>(null);
  const [pending, startTransition] = useTransition();

  const meta = MOVEMENT_META[movement.type];
  const isLoan = movement.type === "lend";
  const isCollection = movement.type === "repay";
  const open_ = movement.status === "active" && !hasPending;
  // A loan's `lend` is corrected from the loan. A collection can't be edited
  // (its amount belongs to the cuota) but it CAN be voided — that's "deshacer
  // cobro": the cuota goes back to pending.
  const canEdit = open_ && !isLoan && !isCollection;
  const canVoid = open_ && !isLoan;

  useEffect(() => {
    if (open) {
      setMode("view");
      setAmount((movement.amount / 100).toFixed(2));
      setConcept(movement.concept ?? "");
      setCost(movement.cost !== null ? (movement.cost / 100).toFixed(2) : "");
      setHistory(null);
      getMovementHistoryAction(movement.id).then((r) => {
        if (r.ok) setHistory(r.history);
      });
    }
  }, [open, movement]);

  function submitEdit() {
    startTransition(async () => {
      const result = await proposeEditAction(
        movement.id,
        { amountSoles: amount, concept, costSoles: cost || undefined },
        {
          type: movement.type,
          amount: movement.amount,
          cost: movement.cost,
          concept: movement.concept,
          date: movement.date,
        },
      );
      if (result.ok) {
        setOpen(false);
        toast.success("Cambio enviado — falta el OK de tu socio");
        router.refresh();
      } else {
        toast.error(ERROR_TEXT[result.error] ?? "Algo salió mal.");
      }
    });
  }

  function submitVoid() {
    startTransition(async () => {
      const result = await proposeVoidAction(movement.id);
      if (result.ok) {
        setOpen(false);
        toast.success(
          isCollection
            ? "Deshacer cobro enviado — falta el OK de tu socio"
            : "Anulación enviada — falta el OK de tu socio",
        );
        router.refresh();
      } else {
        toast.error(ERROR_TEXT[result.error] ?? "Algo salió mal.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {meta.label}
            {movement.concept ? ` · ${movement.concept}` : ""}
          </DialogTitle>
          <DialogDescription>
            {movement.authorName} ·{" "}
            <span className="font-mono tabular-nums">
              {formatCents(movement.amount)}
            </span>
            {movement.status === "voided" && " · anulado"}
          </DialogDescription>
        </DialogHeader>

        {hasPending && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[13px] text-amber-400">
            Hay un cambio esperando el OK del otro socio.
          </p>
        )}

        {mode === "edit" ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Monto (S/)</Label>
              <Input
                id="edit-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(sanitizeMoneyInput(e.target.value))}
                className="h-12 font-mono text-base tabular-nums"
              />
            </div>
            {movement.type === "sell_inventory" && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-cost">Costo (S/) · opcional</Label>
                <Input
                  id="edit-cost"
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => setCost(sanitizeMoneyInput(e.target.value))}
                  className="h-12 font-mono text-base tabular-nums"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="edit-concept">Concepto</Label>
              <Input
                id="edit-concept"
                maxLength={80}
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setMode("view")}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={submitEdit}
                disabled={pending}
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                {pending ? "Enviando…" : "Proponer cambio"}
              </Button>
            </div>
            <p className="text-center text-[11.5px] text-muted-foreground">
              El cambio se aplica cuando tu socio lo apruebe (doble
              confirmación).
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="secondary"
              disabled={!canEdit}
              onClick={() => setMode("edit")}
            >
              Editar
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              disabled={!canVoid || pending}
              onClick={submitVoid}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Anular
            </Button>
          </div>
        )}
        {isLoan && (
          <p className="text-[12px] text-muted-foreground">
            Movimiento generado por un préstamo — se corrige desde el préstamo.
          </p>
        )}
        {isCollection && (
          <p className="text-[12px] text-muted-foreground">
            El monto de un cobro no se edita — viene de la cuota. Anularlo
            devuelve la cuota a pendiente y podrás volver a cobrarla.
          </p>
        )}

        <div className="border-t border-border pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Historial
          </p>
          {history === null ? (
            <p className="mt-2 text-[13px] text-muted-foreground">Cargando…</p>
          ) : history.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted-foreground">
              Sin cambios — registro original.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {history.map((h) => (
                <li key={h.id} className="text-[13px]">
                  <span className="font-medium">{h.proposerName}</span>{" "}
                  {h.kind === "void" ? (
                    "propuso anular"
                  ) : (
                    <>
                      cambió{" "}
                      <span className="font-mono tabular-nums">
                        {formatCents(h.before.amount)}
                      </span>
                      {" → "}
                      <span className="font-mono tabular-nums">
                        {h.after ? formatCents(h.after.amount) : "—"}
                      </span>
                    </>
                  )}{" "}
                  <span
                    className={
                      h.status === "approved"
                        ? "text-emerald-400"
                        : h.status === "rejected"
                          ? "text-destructive"
                          : "text-amber-400"
                    }
                  >
                    ·{" "}
                    {h.status === "pending"
                      ? "esperando OK"
                      : h.status === "approved"
                        ? `aprobado por ${h.deciderName}`
                        : `rechazado por ${h.deciderName}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
