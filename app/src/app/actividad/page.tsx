import { requireUser } from "@/backend/modules/accounts/current-user";
import { findGroupOf } from "@/backend/modules/groups/data";
import { listGroupInstallments } from "@/backend/modules/loans/data";
import { listMovements } from "@/backend/modules/movements/data";
import { ActivityFeed } from "@/components/movements/activity-feed";
import { ActivityTable } from "@/components/movements/activity-table";
import { AppShell } from "@/components/shell/app-shell";
import { isOverdue, todayInLima } from "@/lib/dates";

export default async function ActivityPage() {
  const user = await requireUser();
  const group = await findGroupOf(user.id);
  if (!group) return null;

  const today = todayInLima();
  const [movements, installments] = await Promise.all([
    listMovements(group.id),
    listGroupInstallments(group.id),
  ]);
  const overdueCount = installments.filter(
    (i) => i.status === "pending" && isOverdue(i.dueDate, today),
  ).length;

  return (
    <AppShell
      user={user}
      group={group}
      active="activity"
      overdueCount={overdueCount}
      title="Actividad"
      subtitle="Todos los movimientos del grupo"
    >
      <section className="max-w-4xl rounded-2xl border border-border bg-card p-5">
        {movements.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay movimientos.
          </p>
        ) : (
          <>
            <div className="hidden md:block">
              <ActivityTable movements={movements} today={today} />
            </div>
            <div className="md:hidden">
              <ActivityFeed movements={movements} today={today} />
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
