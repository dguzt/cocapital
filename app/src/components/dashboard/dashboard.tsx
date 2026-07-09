/**
 * The shared dashboard (UC-104 shell; E2 fills movements + activity).
 * Follows the synced Claude Design: capital hero + segment bar + buckets.
 */
import { UserButton } from "@clerk/nextjs";
import type { SessionUser } from "@/backend/modules/accounts/current-user";
import { deriveCapital } from "@/backend/modules/capital/domain/derive";
import type { GroupWithMembers } from "@/backend/modules/groups/data";
import { formatCents } from "@/lib/money";
import { InviteBanner } from "./invite-banner";

export function Dashboard({
  user,
  group,
}: {
  user: SessionUser;
  group: GroupWithMembers;
}) {
  // E2 wires real movements/installments; empty ledger derives to zeros.
  const capital = deriveCapital([], []);
  const buckets = [
    { label: "Efectivo", value: capital.cash, swatch: "bg-emerald-400" },
    { label: "Inventario", value: capital.inventory, swatch: "bg-zinc-500" },
    { label: "Prestado", value: capital.lent, swatch: "bg-zinc-700" },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-4 pt-10 md:p-8">
      <header className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-400 font-mono text-sm font-semibold text-emerald-950">
          S/
        </div>
        <div className="flex-1">
          <h1 className="font-semibold text-lg leading-tight">{group.name}</h1>
          <p className="text-muted-foreground text-xs">
            {group.members.map((m) => m.name).join(" · ")} ·{" "}
            {group.members.length}/2 socios
          </p>
        </div>
        <UserButton />
      </header>

      {group.members.length < 2 && <InviteBanner code={group.inviteCode} />}

      <section className="rounded-2xl border border-border bg-card p-6">
        <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
          Capital total
        </p>
        <p className="mt-2 font-mono text-5xl font-semibold tracking-tight tabular-nums">
          {formatCents(capital.total)}
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {buckets.map((b) => (
            <div
              key={b.label}
              className="rounded-xl border border-border bg-background p-3"
            >
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-sm ${b.swatch}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {b.label}
                </span>
              </div>
              <p className="mt-2 font-mono text-lg font-semibold tabular-nums">
                {formatCents(b.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-2xl text-emerald-400">
          +
        </div>
        <p className="mt-4 font-medium">Aún no hay movimientos</p>
        <p className="mt-1 max-w-xs text-muted-foreground text-sm">
          {user.name}, registra el primer aporte del grupo para empezar a ver el
          capital moverse. (Disponible en la siguiente fase.)
        </p>
      </section>
    </div>
  );
}
