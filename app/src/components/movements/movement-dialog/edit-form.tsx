"use client";
/** UC-401 · The edit form. Submitting only PROPOSES — the partner applies it. */
import { Loader2 } from "lucide-react";
import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeMoneyInput } from "@/lib/money";

export type EditDraft = { amount: string; concept: string; cost: string };

export function EditForm({
  movement,
  draft,
  pending,
  onChange,
  onCancel,
  onSubmit,
}: {
  movement: LedgerMovement;
  draft: EditDraft;
  pending: boolean;
  onChange: (patch: Partial<EditDraft>) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="edit-amount">Monto (S/)</Label>
        <Input
          id="edit-amount"
          inputMode="decimal"
          value={draft.amount}
          onChange={(e) =>
            onChange({ amount: sanitizeMoneyInput(e.target.value) })
          }
          className="h-12 font-mono text-base tabular-nums"
        />
      </div>

      {movement.type === "sell_inventory" && (
        <div className="space-y-1.5">
          <Label htmlFor="edit-cost">Costo (S/) · opcional</Label>
          <Input
            id="edit-cost"
            inputMode="decimal"
            value={draft.cost}
            onChange={(e) =>
              onChange({ cost: sanitizeMoneyInput(e.target.value) })
            }
            className="h-12 font-mono text-base tabular-nums"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="edit-concept">Concepto</Label>
        <Input
          id="edit-concept"
          maxLength={80}
          value={draft.concept}
          onChange={(e) => onChange({ concept: e.target.value })}
          className="h-12 text-base"
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button className="flex-1" onClick={onSubmit} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Enviando…" : "Proponer cambio"}
        </Button>
      </div>

      <p className="text-center text-[11.5px] text-muted-foreground">
        El cambio se aplica cuando tu socio lo apruebe (doble confirmación).
      </p>
    </div>
  );
}
