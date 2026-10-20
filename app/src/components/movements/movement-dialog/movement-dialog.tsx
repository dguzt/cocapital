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
import { getSaleTargetForMovementAction } from "@/backend/modules/inventory/adapters/in/next/credit-sale-actions";
import { getLoanTargetForMovementAction } from "@/backend/modules/loans/adapters/in/next/loan-actions";
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
    "Este movimiento pertenece a un préstamo o a una venta en cuotas — corrígelo desde ahí.",
  MovementVoided: "Este movimiento ya fue anulado.",
  InvalidAmount: "Ingresa un monto válido.",
  InvalidCost: "El costo no es válido.",
};

const emptyDraft: EditDraft = { amount: "", concept: "", cost: "" };

type Owner = "loan" | "sale" | null;

const OWNER_OF: Partial<Record<LedgerMovement["type"], Owner>> = {
  lend: "loan",
  repay: "loan",
  sell_on_credit: "sale",
  collect_sale: "sale",
};

const OWNER_TEXT = {
  loan: {
    button: "Ir al préstamo",
    collection:
      "Este cobro pertenece a un préstamo. Para anularlo, ve al préstamo.",
    entry:
      "Este movimiento pertenece a un préstamo. Para editarlo o anularlo, ve al préstamo.",
  },
  sale: {
    button: "Ir a la venta",
    collection:
      "Este cobro pertenece a una venta en cuotas. Para anularlo, ve a la venta.",
    entry:
      "Este movimiento pertenece a una venta en cuotas. Para anularla, ve a la venta.",
  },
} as const;

/** The page a ledger row of a loan or a credit sale links to, at its cuota. */
async function ownerHref(
  owner: "loan" | "sale",
  movement: LedgerMovement,
): Promise<string | null> {
  if (owner === "loan") {
    const { target } = await getLoanTargetForMovementAction(
      movement.id,
      movement.type,
    );

    if (!target) {
      return null;
    }

    return target.installmentId
      ? `/prestamos/${target.loanId}?cuota=${target.installmentId}`
      : `/prestamos/${target.loanId}`;
  }

  const { target } = await getSaleTargetForMovementAction(
    movement.id,
    movement.type,
  );

  return target ? `/ventas/${target.saleId}` : null;
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
  const [target, setTarget] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const meta = MOVEMENT_META[movement.type];
  const { canEdit, canVoid, note } = allowedActions(
    movement.type,
    movement.status,
    hasPending,
  );
  const owner = OWNER_OF[movement.type] ?? null;

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
      if (owner) {
        ownerHref(owner, movement).then(setTarget);
      }
    }
  }, [open, movement, owner]);

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
        ) : owner ? (
          <div className="rounded-lg border border-border bg-secondary/50 px-3 py-3">
            <p className="text-[13px] text-muted-foreground">
              {movement.type === "repay" || movement.type === "collect_sale"
                ? OWNER_TEXT[owner].collection
                : OWNER_TEXT[owner].entry}
            </p>
            <Button
              className="mt-2.5 w-full"
              disabled={!target}
              asChild={!!target}
              onClick={() => setOpen(false)}
            >
              {target ? (
                <Link href={target}>
                  <ArrowRight className="size-4" /> {OWNER_TEXT[owner].button}
                </Link>
              ) : (
                <>
                  <Loader2 className="size-4 animate-spin" />{" "}
                  {OWNER_TEXT[owner].button}
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

        {mode === "view" && !owner && note && (
          <p className="text-[12px] text-muted-foreground">{note}</p>
        )}

        <ChangeHistory history={history} />
      </DialogContent>
    </Dialog>
  );
}
