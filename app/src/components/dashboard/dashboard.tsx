/**
 * The shared dashboard (UC-202/203), per the synced Claude Design:
 * capital hero + segment bar + buckets, ganancia split, activity feed.
 * Mobile-first; desktop gets the two-column grid.
 */
import { UserButton } from "@clerk/nextjs";
import type { SessionUser } from "@/backend/modules/accounts/current-user";
import { deriveCapital } from "@/backend/modules/capital/domain/derive";
import type { GroupWithMembers } from "@/backend/modules/groups/data";
import type { LedgerMovement } from "@/backend/modules/movements/data";
import { ActivityFeed } from "@/components/movements/activity-feed";
import { MovementSheet } from "@/components/movements/movement-sheet";
import type { ISODate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { InviteBanner } from "./invite-banner";

export function Dashboard({
  user,
  group,
  movements,
  today,
}: {
  user: SessionUser;
  group: GroupWithMembers;
  movements: LedgerMovement[];
  today: ISODate;
}) {
  // E3 wires real installments; until then the loan terms are all pending.
  const capital = deriveCapital(movements, []);
  const positive =
    Math.max(capital.cash, 0) +
    Math.max(capital.inventory, 0) +
    Math.max(capital.lent, 0);
  const pct = (v: number) =>
    positive > 0 ? `${((Math.max(v, 0) / positive) * 100).toFixed(1)}%` : "0%";

  const buckets = [
    { label: "Efectivo", value: capital.cash, swatch: "bg-emerald-400" },
    { label: "Inventario", value: capital.inventory, swatch: "bg-zinc-500" },
    { label: "Prestado", value: capital.lent, swatch: "bg-zinc-700" },
  ];
  const totalProfit = capital.salesProfit + capital.collectedInterest;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 p-4 pt-8 pb-24 md:p-8 md:pb-8">
      <header className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-400 font-mono text-sm font-semibold text-emerald-950">
          S/
        </div>
        <div className="flex-1">
          <h1 className="font-semibold text-xl leading-tight">{group.name}</h1>
          <p className="text-muted-foreground text-xs">
            {group.members.map((m) => m.name).join(" · ")} ·{" "}
            {group.members.length}/2 socios
          </p>
        </div>
        <div className="hidden md:block">
          <MovementSheet />
        </div>
        <UserButton />
      </header>

      {group.members.length < 2 && <InviteBanner code={group.inviteCode} />}

      <div className="grid gap-5 md:grid-cols-[1.55fr_1fr] md:items-start">
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-border bg-card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Capital total
            </p>
            <p className="mt-2 font-mono text-5xl font-semibold tracking-tight tabular-nums">
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
            <div className="mt-5 grid grid-cols-3 gap-3">
              {buckets.map((b) => (
                <div
                  key={b.label}
                  className="rounded-xl border border-border bg-background p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className={`size-2.5 rounded-sm ${b.swatch}`} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {b.label}
                    </span>
                  </div>
                  <p className="mt-2 font-mono font-semibold tabular-nums text-base md:text-xl">
                    {formatCents(b.value)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Actividad reciente</h2>
              <span className="text-xs text-muted-foreground">
                {movements.length} movimiento{movements.length === 1 ? "" : "s"}
              </span>
            </div>
            {movements.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-xl text-emerald-400">
                  +
                </div>
                <p className="mt-3 font-medium text-sm">
                  Aún no hay movimientos
                </p>
                <p className="mt-1 max-w-xs text-muted-foreground text-xs">
                  {user.name}, registra el primer aporte del grupo con el botón
                  de abajo.
                </p>
              </div>
            ) : (
              <ActivityFeed movements={movements} today={today} limit={8} />
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Ganancia acumulada</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Por ventas
              </p>
              <p className="mt-1.5 font-mono text-lg font-semibold text-emerald-400 tabular-nums">
                {formatCents(capital.salesProfit)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Por intereses
              </p>
              <p className="mt-1.5 font-mono text-lg font-semibold text-emerald-400 tabular-nums">
                {formatCents(capital.collectedInterest)}
              </p>
            </div>
          </div>
          <p className="mt-3 inline-flex rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
            Ganancia total del grupo · {formatCents(totalProfit)}
          </p>
        </section>
      </div>

      <div className="md:hidden">
        <MovementSheet />
      </div>
    </div>
  );
}
