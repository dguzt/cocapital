"use client";
/**
 * Movement detail (E4). This file orchestrates; the rules of what you may do
 * to each type live in actions-by-type.ts, next to their reason.
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
import type { ChangeHistoryItem } from "@/backend/modules/movements/usecases/get-movement-history";
import type { LedgerMovement } from "@/backend/modules/movements/usecases/list-movements";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCents } from "@/lib/money";
import { MOVEMENT_META } from "../movement-meta";
import { allowedActions } from "./actions-by-type";
import { ChangeHistory } from "./change-history";
import { type EditDraft, EditForm } from "./edit-form";

const ERROR_TEXT: Record<string, string> = {
  ChangeAlreadyPending: "Ya hay un cambio esperando el OK de tu socio.",
  SystemMovement:
    "Este movimiento pertenece a un préstamo — corrígelo desde el préstamo.",
  MovementVoided: "Este movimiento ya fue anulado.",
  InvalidAmount: "Ingresa un monto válido.",
  InvalidCost: "El costo no es válido.",
};

const emptyDraft: EditDraft = { amount: "", concept: "", cost: "" };

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
  const [draft, setDraft] = useState<EditDraft>(emptyDraft);
  const [history, setHistory] = useState<ChangeHistoryItem[] | null>(null);
  const [pending, startTransition] = useTransition();

  const meta = MOVEMENT_META[movement.type];
  const { canEdit, canVoid, note } = allowedActions(
    movement.type,
    movement.status,
    hasPending,
  );
  const isCollection = movement.type === "repay";

  useEffect(() => {
    if (open) {
      setMode("view");
      setDraft({
        amount: (movement.amount / 100).toFixed(2),
        concept: movement.concept ?? "",
        cost: movement.cost !== null ? (movement.cost / 100).toFixed(2) : "",
      });
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
        {
          amountSoles: draft.amount,
          concept: draft.concept,
          costSoles: draft.cost || undefined,
        },
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
          <EditForm
            movement={movement}
            draft={draft}
            pending={pending}
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            onCancel={() => setMode("view")}
            onSubmit={submitEdit}
          />
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

        {mode === "view" && note && (
          <p className="text-[12px] text-muted-foreground">{note}</p>
        )}

        <ChangeHistory history={history} />
      </DialogContent>
    </Dialog>
  );
}
