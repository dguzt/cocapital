"use client";
/**
 * Movement detail (E4). This file orchestrates; the rules of what you may do
 * to each type live in actions-by-type.ts, next to their reason.
 */
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getLoanTargetForMovementAction } from "@/backend/modules/loans/adapters/in/next/loan-actions";
import type { LoanTarget } from "@/backend/modules/loans/domain/loan-target";
import {
  getMovementHistoryAction,
  proposeEditAction,
  proposeVoidAction,
} from "@/backend/modules/movements/adapters/in/next/movement-actions";
import type { ChangeHistoryItem } from "@/backend/modules/movements/domain/change-history-item";
import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import { MOVEMENT_META } from "@/components/movements/movement-meta";
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

/** The loan page a ledger row links to — a `repay` also points at its cuota. */
function loanHref(target: LoanTarget): string {
  return target.installmentId
    ? `/prestamos/${target.loanId}?cuota=${target.installmentId}`
    : `/prestamos/${target.loanId}`;
}

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
  const [target, setTarget] = useState<LoanTarget | null>(null);
  const [pending, startTransition] = useTransition();

  const meta = MOVEMENT_META[movement.type];
  const { canEdit, canVoid, note } = allowedActions(
    movement.type,
    movement.status,
    hasPending,
  );
  // A loan's entries (lend/repay) are corrected from the loan, not here — the
  // dialog derives the user there instead of offering Editar/Anular.
  const belongsToLoan = movement.type === "lend" || movement.type === "repay";

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
      setTarget(null);
      if (belongsToLoan) {
        getLoanTargetForMovementAction(movement.id, movement.type).then((r) => {
          if (r.ok) setTarget(r.target);
        });
      }
    }
  }, [open, movement, belongsToLoan]);

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
        toast.success("Anulación enviada — falta el OK de tu socio");
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
        ) : belongsToLoan ? (
          <div className="rounded-lg border border-border bg-secondary/50 px-3 py-3">
            <p className="text-[13px] text-muted-foreground">
              {movement.type === "repay"
                ? "Este cobro pertenece a un préstamo. Para anularlo, ve al préstamo."
                : "Este movimiento pertenece a un préstamo. Para editarlo o anularlo, ve al préstamo."}
            </p>
            <Button
              className="mt-2.5 w-full"
              disabled={!target}
              asChild={!!target}
              onClick={() => setOpen(false)}
            >
              {target ? (
                <Link href={loanHref(target)}>
                  <ArrowRight className="size-4" /> Ir al préstamo
                </Link>
              ) : (
                <>
                  <Loader2 className="size-4 animate-spin" /> Ir al préstamo
                </>
              )}
            </Button>
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

        {mode === "view" && !belongsToLoan && note && (
          <p className="text-[12px] text-muted-foreground">{note}</p>
        )}

        <ChangeHistory history={history} />
      </DialogContent>
    </Dialog>
  );
}
