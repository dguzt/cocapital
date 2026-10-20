/**
 * Panel content, per the desktop prototype: LEFT = capital hero (big number,
 * segment bar, 3 stats) + Actividad reciente table · RIGHT = "Dónde está" +
 * "Ganancia acumulada". Mobile stacks with the list feed.
 */
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { UserView } from "@/backend/modules/accounts/adapters/in/next/user-view";
import type { CapitalSummary } from "@/backend/modules/capital/domain/capital-summary";
import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import { ActivityFeed } from "@/components/movements/activity-feed";
import { ActivityTable } from "@/components/movements/activity-table";
import { MovementSheet } from "@/components/movements/movement-sheet";
import type { ISODate } from "@/lib/dates";
import { formatCents } from "@/lib/money";

export function PanelContent({
  user,
  movements,
  capital,
  pendingIds,
  today,
}: {
  user: UserView;
  movements: LedgerMovement[];
  capital: CapitalSummary;
  pendingIds: string[];
  today: ISODate;
}) {
  const positive =
    Math.max(capital.cash, 0) +
    Math.max(capital.inventory, 0) +
    Math.max(capital.lent, 0) +
    Math.max(capital.receivable, 0);
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
      href: "/prestamos",
    },
    {
      label: "Por cobrar",
      full: "Cuentas por cobrar",
      value: capital.receivable,
      swatch: "bg-zinc-800",
      href: "/ventas",
    },
  ];
  // What the group has but can't spend today: inventory, loans and credit sales.
  const immobilized = capital.inventory + capital.lent + capital.receivable;
  const immobilizedRows = [
    {
      label: "Inventario",
      value: capital.inventory,
      swatch: "bg-zinc-500",
      testId: "capital-inventory",
    },
    {
      label: "Prestado",
      value: capital.lent,
      swatch: "bg-zinc-700",
      testId: "capital-lent",
    },
    {
      label: "Cuentas por cobrar",
      value: capital.receivable,
      swatch: "bg-zinc-800",
      testId: "capital-receivable",
    },
  ];
  const totalProfit = capital.salesProfit + capital.collectedInterest;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr] xl:items-start">
      <div className="flex min-w-0 flex-col gap-5">
        {/* hero — liquidity first: cash is the headline, everything else
            collapses into "inmovilizado" (what exists but can't be spent). */}
        <section className="rounded-2xl border border-border bg-gradient-to-br from-card to-[#121215] p-6 md:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Efectivo disponible
          </p>
          <p
            data-testid="capital-cash"
            className="mt-3 font-mono text-5xl font-semibold tracking-tighter tabular-nums md:text-[52px] md:leading-none"
          >
            {formatCents(capital.cash)}
          </p>
          {/* one thing only: how much is liquid vs. tied up */}
          <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-lg bg-secondary">
            <div
              className="bg-emerald-400"
              style={{ width: pct(capital.cash) }}
            />
            <div className="bg-zinc-600" style={{ width: pct(immobilized) }} />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-zinc-500">
            <span>Disponible · {pct(capital.cash)}</span>
            <span>Inmovilizado · {pct(immobilized)}</span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3.5">
            {/* inmovilizado — the total, then its pieces */}
            <div className="rounded-xl border border-border bg-sidebar p-3.5 sm:p-4">
              <div className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-sm bg-zinc-600" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Inmovilizado
                </span>
              </div>
              <p className="mt-2.5 whitespace-nowrap font-mono text-[22px] font-semibold tabular-nums">
                {formatCents(immobilized)}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {immobilizedRows.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2 text-[13px] text-zinc-300">
                      <span className={`size-2 rounded-sm ${r.swatch}`} />
                      {r.label}
                    </span>
                    <span
                      data-testid={r.testId}
                      className="whitespace-nowrap font-mono text-[13px] font-medium tabular-nums"
                    >
                      {formatCents(r.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* capital total — context, not the headline anymore */}
            <div className="rounded-xl border border-border bg-sidebar p-3.5 sm:p-4">
              <div className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-sm border border-zinc-600 bg-secondary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Capital total
                </span>
              </div>
              <p
                data-testid="capital-total"
                className="mt-2.5 whitespace-nowrap font-mono text-[22px] font-semibold tabular-nums"
              >
                {formatCents(capital.total)}
              </p>
              <p className="mt-0.5 whitespace-nowrap font-mono text-[11px] text-zinc-500 tabular-nums">
                efectivo + inmovilizado
              </p>
            </div>
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
                    {"href" in b && (
                      <ChevronRight className="ml-0.5 inline size-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <span className="font-mono text-[14.5px] font-medium tabular-nums">
                    {formatCents(b.value)}
                  </span>
                </>
              );
              const cls = `flex w-full items-center gap-3 py-3 ${i < buckets.length - 1 ? "border-b border-border" : ""}`;
              return "href" in b && b.href ? (
                <Link key={b.label} href={b.href} className={cls}>
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
          {capital.expectedSalesMargin > 0 && (
            <p
              data-testid="capital-expected-sales-margin"
              className="mt-2 text-xs text-muted-foreground"
            >
              Margen por cobrar en ventas ·{" "}
              <span className="font-mono tabular-nums">
                {formatCents(capital.expectedSalesMargin)}
              </span>{" "}
              · no suma al total hasta cobrarse
            </p>
          )}
        </section>
      </div>

      {/* mobile: floating "+" */}
      <div className="md:hidden">
        <MovementSheet />
      </div>
    </div>
  );
}
