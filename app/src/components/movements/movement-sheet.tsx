"use client";
/** UC-201: the "+" flow — type grid → amount → (cost) → concept → save.
 *  Target: ~10 seconds on a phone. lend/repay route to E3's flows. */

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Minus,
  PackageMinus,
  PackagePlus,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addMovementAction } from "@/backend/modules/movements/actions";
import type { MovementType } from "@/backend/modules/movements/domain/movement";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DIR_BADGE, MOVEMENT_META } from "./movement-meta";

const ICONS: Record<MovementType, React.ReactNode> = {
  contribute: <Plus className="size-4" />,
  expense: <Minus className="size-4" />,
  buy_inventory: <PackagePlus className="size-4" />,
  sell_inventory: <PackageMinus className="size-4" />,
  lend: <ArrowUpFromLine className="size-4" />,
  repay: <ArrowDownToLine className="size-4" />,
};

const ERROR_TEXT: Record<string, string> = {
  InvalidAmount: "Ingresa un monto válido en soles.",
  InvalidCost: "El costo debe ser un número válido.",
  InvalidType: "Elige un tipo de movimiento.",
  NoGroup: "Aún no perteneces a un grupo.",
};

/** Manual types in the sheet's visual order; lend/repay disabled until E3. */
const SHEET_TYPES: { type: MovementType; enabled: boolean }[] = [
  { type: "contribute", enabled: true },
  { type: "buy_inventory", enabled: true },
  { type: "sell_inventory", enabled: true },
  { type: "expense", enabled: true },
  { type: "lend", enabled: false },
  { type: "repay", enabled: false },
];

export function MovementSheet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MovementType>("contribute");
  const [amount, setAmount] = useState("");
  const [cost, setCost] = useState("");
  const [concept, setConcept] = useState("");
  const [pending, startTransition] = useTransition();

  const needsCost = type === "sell_inventory";

  function save() {
    startTransition(async () => {
      const result = await addMovementAction({
        type,
        amountSoles: amount,
        costSoles: needsCost ? cost : undefined,
        concept,
      });
      if (result.ok) {
        setOpen(false);
        setAmount("");
        setCost("");
        setConcept("");
        toast.success("Movimiento registrado");
        router.refresh();
      } else {
        toast.error(ERROR_TEXT[result.error] ?? "Algo salió mal.");
      }
    });
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          size="lg"
          className="fixed inset-x-4 bottom-4 z-40 h-13 shadow-lg shadow-emerald-400/20 md:static md:inset-auto md:w-auto"
        >
          <Plus className="size-5" /> Agregar movimiento
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-4 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle>Nuevo movimiento</DrawerTitle>
          </DrawerHeader>

          <div className="grid grid-cols-3 gap-2">
            {SHEET_TYPES.map(({ type: t, enabled }) => {
              const meta = MOVEMENT_META[t];
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!enabled}
                  onClick={() => setType(t)}
                  className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-border bg-background hover:border-muted-foreground/40"
                  } ${enabled ? "" : "opacity-40"}`}
                >
                  <span
                    className={`flex size-7 items-center justify-center rounded-lg ${DIR_BADGE[meta.dir]}`}
                  >
                    {ICONS[t]}
                  </span>
                  <span>
                    <span className="block font-medium text-sm">
                      {meta.label}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {enabled ? meta.hint : "Muy pronto"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto (S/)</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-14 font-mono text-2xl font-semibold tabular-nums"
              />
            </div>
            {needsCost && (
              <div className="space-y-2">
                <Label htmlFor="cost">
                  Costo de lo vendido (S/) · opcional
                </Label>
                <Input
                  id="cost"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="h-12 font-mono text-base tabular-nums"
                />
                <p className="text-[11px] text-muted-foreground">
                  Con el costo, la ganancia de la venta entra al capital.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="concept">Concepto · opcional</Label>
              <Input
                id="concept"
                placeholder="Ej. 3 perfumes · feria"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <Button
              className="h-12 w-full"
              onClick={save}
              disabled={pending || !amount.trim()}
            >
              {pending ? "Guardando…" : "Guardar movimiento"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
