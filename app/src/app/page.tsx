import { Activity } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/backend/modules/accounts/current-user";
import { findGroupOf } from "@/backend/modules/groups/data";
import { listGroupInstallments } from "@/backend/modules/loans/data";
import { listPendingChanges } from "@/backend/modules/movements/changes-data";
import { listMovements } from "@/backend/modules/movements/data";
import { PanelContent } from "@/components/dashboard/dashboard";
import { InviteBanner } from "@/components/dashboard/invite-banner";
import { MovementSheet } from "@/components/movements/movement-sheet";
import { PendingApprovals } from "@/components/movements/pending-approvals";
import { Onboarding } from "@/components/onboarding/onboarding";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { isOverdue, todayInLima } from "@/lib/dates";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const group = await findGroupOf(user.id);
  const { error } = await searchParams;

  if (!group) {
    return <Onboarding userName={user.name} error={error} />;
  }

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
      active="panel"
      overdueCount={overdueCount}
      title="Panel"
      subtitle="Resumen del capital compartido"
      actions={
        <>
          <Button asChild variant="outline">
            <Link href="/actividad">
              <Activity className="size-4" /> Actividad
            </Link>
          </Button>
          <MovementSheet />
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {group.members.length < 2 && <InviteBanner code={group.inviteCode} />}
        <PendingApprovals items={approvalsForMe} />
        <PanelContent
          user={user}
          movements={movements}
          installments={installments}
          pendingIds={pendingIds}
          today={today}
        />
      </div>
    </AppShell>
  );
}
