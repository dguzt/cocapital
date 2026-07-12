"use client";
/** UC-404 · Every proposal ever made on this movement, decided or not. */
import type { ChangeHistoryItem } from "@/backend/modules/movements/usecases/get-movement-history";
import { formatCents } from "@/lib/money";

const STATUS_CLS = {
  approved: "text-emerald-400",
  rejected: "text-destructive",
  pending: "text-amber-400",
} as const;

export function ChangeHistory({
  history,
}: {
  history: ChangeHistoryItem[] | null;
}) {
  return (
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
              <span className={STATUS_CLS[h.status]}>
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
  );
}
