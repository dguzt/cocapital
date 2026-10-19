"use client";
/** UC-403: changes waiting for MY approval — inline Aprobar/Rechazar. */
import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { decideChangeAction } from "@/backend/modules/movements/adapters/in/next/movement-actions";
import type { PendingChangeItem } from "@/backend/modules/movements/domain/pending-change-item";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import { MOVEMENT_META } from "./movement-meta";

export function PendingApprovals({ items }: { items: PendingChangeItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actingOn, setActingOn] = useState<string | null>(null);

  if (items.length === 0) return null;

  function decide(id: string, decision: "approve" | "reject") {
    setActingOn(id);
    startTransition(async () => {
      const result = await decideChangeAction(id, decision);
      if (result.ok) {
        toast.success(
          decision === "approve" ? "Cambio aprobado" : "Cambio rechazado",
        );
        router.refresh();
      } else {
        toast.error("No se pudo registrar tu decisión.");
        router.refresh();
      }
      setActingOn(null);
    });
  }

  return (
    <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
      <p className="text-sm font-semibold">
        Tu socio propone {items.length} cambio{items.length > 1 ? "s" : ""} —
        falta tu OK
      </p>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => {
          const meta = MOVEMENT_META[item.before.type];
          const acting = actingOn === item.id;
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <span className="min-w-0 flex-1 text-[13.5px]">
                <span className="font-semibold">{item.proposerName}</span>{" "}
                {item.kind === "void" && item.before.type === "repay" ? (
                  <>
                    quiere{" "}
                    <span className="text-destructive">deshacer el cobro</span>
                    {item.before.concept ? ` de ${item.before.concept}` : ""} de{" "}
                    <span className="font-mono tabular-nums">
                      {formatCents(item.before.amount)}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      — la cuota vuelve a pendiente
                    </span>
                  </>
                ) : item.kind === "void" && item.before.type === "lend" ? (
                  <>
                    quiere{" "}
                    <span className="text-destructive">anular el préstamo</span>{" "}
                    de{" "}
                    <span className="font-mono tabular-nums">
                      {formatCents(item.before.amount)}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      — se revierte por completo, incluidos sus cobros
                    </span>
                  </>
                ) : item.kind === "void" ? (
                  <>
                    quiere <span className="text-destructive">anular</span>{" "}
                    {meta.label}
                    {item.before.concept ? ` · ${item.before.concept}` : ""} de{" "}
                    <span className="font-mono tabular-nums">
                      {formatCents(item.before.amount)}
                    </span>
                  </>
                ) : (
                  <>
                    quiere cambiar {meta.label}
                    {item.before.concept ? ` · ${item.before.concept}` : ""}:{" "}
                    <span className="font-mono tabular-nums">
                      {formatCents(item.before.amount)}
                    </span>
                    {" → "}
                    <span className="font-mono font-semibold tabular-nums">
                      {item.after ? formatCents(item.after.amount) : "—"}
                    </span>
                  </>
                )}
              </span>
              <span className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => decide(item.id, "reject")}
                >
                  {acting && pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                  Rechazar
                </Button>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => decide(item.id, "approve")}
                >
                  {acting && pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Aprobar
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
