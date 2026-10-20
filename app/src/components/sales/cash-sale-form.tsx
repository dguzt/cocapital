"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addMovementAction } from "@/backend/modules/movements/adapters/in/next/movement-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeMoneyInput } from "@/lib/money";

const ERROR_TEXT: Record<string, string> = {
  InvalidAmount: "Ingresa un precio válido en soles.",
  InvalidCost: "El costo debe ser un número válido.",
};

/** A sale paid in full now: cash in, cost out of inventory. */
export function CashSaleForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [item, setItem] = useState("");

  function save() {
    startTransition(async () => {
      const result = await addMovementAction({
        type: "sell_inventory",
        amountSoles: price,
        costSoles: cost,
        concept: item,
      });

      if (result.ok) {
        toast.success("Venta registrada");
        router.push("/");
      } else {
        toast.error(ERROR_TEXT[result.error] ?? "Algo salió mal.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cash-price">Precio (S/)</Label>
          <Input
            id="cash-price"
            inputMode="decimal"
            placeholder="210.00"
            value={price}
            onChange={(e) => setPrice(sanitizeMoneyInput(e.target.value))}
            className="h-12 font-mono text-lg tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cash-cost">Costo base (S/) · opcional</Label>
          <Input
            id="cash-cost"
            inputMode="decimal"
            placeholder="0.00"
            value={cost}
            onChange={(e) => setCost(sanitizeMoneyInput(e.target.value))}
            className="h-12 font-mono text-lg tabular-nums"
          />
        </div>
      </div>
      <p className="-mt-3 text-[11px] text-muted-foreground">
        Con el costo, la ganancia de la venta entra al capital.
      </p>
      <div className="space-y-2">
        <Label htmlFor="cash-item">Qué vendes · opcional</Label>
        <Input
          id="cash-item"
          maxLength={80}
          placeholder="Ej. 3 perfumes · feria"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className="h-12 text-base"
        />
      </div>
      <Button
        className="h-13 w-full text-base"
        disabled={pending || !price.trim()}
        onClick={save}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Registrando…" : "Registrar venta"}
      </Button>
    </div>
  );
}
