import { requireUser } from "@/backend/modules/accounts/current-user";
import { findGroupOf } from "@/backend/modules/groups/data";
import { listGroupInstallments } from "@/backend/modules/loans/usecases/list-group-installments";
import { listMovements } from "@/backend/modules/movements/usecases/list-movements";
import { listPendingChanges } from "@/backend/modules/movements/usecases/list-pending-changes";
import { ActivityFeed } from "@/components/movements/activity-feed";
import { ActivityTable } from "@/components/movements/activity-table";
import { PendingApprovals } from "@/components/movements/pending-approvals";
import { AppShell } from "@/components/shell/app-shell";
import { isOverdue, todayInLima } from "@/lib/dates";

export default async function ActivityPage() {
  const user = await requireUser();
  const group = await findGroupOf(user.id);
  if (!group) return null;

  const today = todayInLima();
  const [movements, installments, pendingChanges] = await Promise.all([
    listMovements(group.id),
    listGroupInstallments(group.id),
    listPendingChanges(group.id),
  ]);
  const overdueCount = installments.filter(
    (i) => i.status === "pending" && isOverdue(i.dueDate, today),
  ).length;
  const approvalsForMe = pendingChanges.filter((c) => c.proposedBy !== user.id);
  const pendingIds = pendingChanges.map((c) => c.movementId);

  return (
    <AppShell
      user={user}
      group={group}
      active="activity"
      overdueCount={overdueCount}
      title="Actividad"
      subtitle="Todos los movimientos del grupo"
    >
      <div className="flex max-w-4xl flex-col gap-5">
        <PendingApprovals items={approvalsForMe} />
        <section className="rounded-2xl border border-border bg-card p-5">
          {movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay movimientos.
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <ActivityTable
                  movements={movements}
                  today={today}
                  pendingIds={pendingIds}
                />
              </div>
              <div className="md:hidden">
                <ActivityFeed
                  movements={movements}
                  today={today}
                  pendingIds={pendingIds}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
