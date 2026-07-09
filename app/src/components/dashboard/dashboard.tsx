/**
 * Panel content, per the desktop prototype: LEFT = capital hero (big number,
 * segment bar, 3 stats) + Actividad reciente table · RIGHT = "Dónde está" +
 * "Ganancia acumulada". Mobile stacks with the list feed.
 */
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { SessionUser } from "@/backend/modules/accounts/current-user";
import type { CapitalInstallment } from "@/backend/modules/capital/domain/derive";
import { deriveCapital } from "@/backend/modules/capital/domain/derive";
import type { LedgerMovement } from "@/backend/modules/movements/data";
import { ActivityFeed } from "@/components/movements/activity-feed";
import { ActivityTable } from "@/components/movements/activity-table";
import { MovementSheet } from "@/components/movements/movement-sheet";
import type { ISODate } from "@/lib/dates";
import { formatCents } from "@/lib/money";

export function PanelContent({
  user,
  movements,
  installments,
  pendingIds,
  today,
}: {
  user: SessionUser;
  movements: LedgerMovement[];
  installments: CapitalInstallment[];
  pendingIds: string[];
  today: ISODate;
}) {
  const capital = deriveCapital(movements, installments);
  const positive =
    Math.max(capital.cash, 0) +
    Math.max(capital.inventory, 0) +
    Math.max(capital.lent, 0);
  const pct = (v: number) =>
    positive > 0 ? `${((Math.max(v, 0) / positive) * 100).toFixed(1)}%` : "0%";

  const buckets = [
    {
      label: "Efectivo",
      full: "Efectivo disponible",
      value: capital.cash,
      swatch: "bg-emerald-400",
    },
    {
      label: "Inventario",
      full: "Inventario",
      value: capital.inventory,
      swatch: "bg-zinc-500",
    },
    {
      label: "Prestado",
      full: "Prestado",
      value: capital.lent,
      swatch: "bg-zinc-700",
    },
  ];
  const totalProfit = capital.salesProfit + capital.collectedInterest;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr] xl:items-start">
      <div className="flex min-w-0 flex-col gap-5">
        {/* hero */}
        <section className="rounded-2xl border border-border bg-gradient-to-br from-card to-[#121215] p-6 md:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Capital total
          </p>
          <p className="mt-3 font-mono text-5xl font-semibold tracking-tighter tabular-nums md:text-[52px] md:leading-none">
            {formatCents(capital.total)}
          </p>
          <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-lg bg-secondary">
            {buckets.map((b) => (
              <div
                key={b.label}
                className={b.swatch}
                style={{ width: pct(b.value) }}
              />
            ))}
          </div>
          {/* Phones: full-width rows (nothing can truncate). ≥sm: 3 columns. */}
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3.5">
            {buckets.map((b) => (
              <div
                key={b.label}
                className="flex items-center gap-3 rounded-xl border border-border bg-sidebar p-3.5 sm:block sm:p-4"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`size-2.5 shrink-0 rounded-sm ${b.swatch}`}
                  />
                  <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {b.label}
                  </span>
                </div>
                <div className="ml-auto text-right sm:ml-0 sm:mt-2.5 sm:text-left">
                  <p className="whitespace-nowrap font-mono font-semibold tabular-nums text-[15px] sm:text-base xl:text-[22px]">
                    {formatCents(b.value)}
                  </p>
                  <p className="mt-0.5 whitespace-nowrap font-mono text-[11px] text-zinc-500 tabular-nums sm:text-[11.5px]">
                    {pct(b.value)} del capital
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* actividad reciente */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">Actividad reciente</h2>
            <Link
              href="/actividad"
              className="text-[13px] font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Ver todo →
            </Link>
          </div>
          {movements.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-xl text-emerald-400">
                +
              </div>
              <p className="mt-3 font-medium text-sm">Aún no hay movimientos</p>
              <p className="mt-1 max-w-xs text-muted-foreground text-xs">
                {user.name}, registra el primer aporte del grupo con "Agregar
                movimiento".
              </p>
            </div>
          ) : (
            <>
              <div className="mt-2 hidden overflow-x-auto md:block">
                <ActivityTable
                  movements={movements}
                  today={today}
                  pendingIds={pendingIds}
                  limit={6}
                />
              </div>
              <div className="md:hidden">
                <ActivityFeed
                  movements={movements}
                  today={today}
                  pendingIds={pendingIds}
                  limit={6}
                />
              </div>
            </>
          )}
        </section>
      </div>

      {/* right column */}
      <div className="flex flex-col gap-5">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-bold">Dónde está</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Cómo se reparte el capital del grupo ahora mismo.
          </p>
          <div className="mt-4">
            {buckets.map((b, i) => {
              const row = (
                <>
                  <span className={`size-2.5 rounded-sm ${b.swatch}`} />
                  <span className="flex-1 text-left text-sm font-semibold">
                    {b.full}
                    {b.label === "Prestado" && (
                      <ChevronRight className="ml-0.5 inline size-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <span className="font-mono text-[14.5px] font-medium tabular-nums">
                    {formatCents(b.value)}
                  </span>
                </>
              );
              const cls = `flex w-full items-center gap-3 py-3 ${i < buckets.length - 1 ? "border-b border-border" : ""}`;
              return b.label === "Prestado" ? (
                <Link key={b.label} href="/prestamos" className={cls}>
                  {row}
                </Link>
              ) : (
                <div key={b.label} className={cls}>
                  {row}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-bold">Ganancia acumulada</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: "Por ventas", value: capital.salesProfit },
              { label: "Por intereses", value: capital.collectedInterest },
            ].map((g) => (
              <div
                key={g.label}
                className="rounded-xl border border-border bg-sidebar p-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {g.label}
                </p>
                <p className="mt-1.5 whitespace-nowrap font-mono text-lg font-semibold text-emerald-400 tabular-nums xl:text-[22px]">
                  {formatCents(g.value)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3.5 inline-flex rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Ganancia total del grupo · {formatCents(totalProfit)}
          </p>
        </section>
      </div>

      {/* mobile: floating "+" */}
      <div className="md:hidden">
        <MovementSheet />
      </div>
    </div>
  );
}
