import { Activity } from "lucide-react";
import Link from "next/link";
import { useCases } from "@/backend/application/container";
import { getCurrentUser } from "@/backend/modules/accounts/adapters/in/next/session";
import { toUserView } from "@/backend/modules/accounts/adapters/in/next/user-view";
import { toGroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { PanelContent } from "@/components/dashboard/dashboard";
import { InviteBanner } from "@/components/dashboard/invite-banner";
import { Landing } from "@/components/landing/landing";
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
  // "/" is public: landing for visitors, Panel for members (proxy allows it).
  const user = await getCurrentUser();
  if (!user) {
    return <Landing />;
  }
  const group = await useCases.getMyGroup.execute({ userId: user.id });
  const { error } = await searchParams;

  if (!group) {
    return <Onboarding userName={user.name} error={error} />;
  }

  const today = todayInLima();
  const [movements, installments, pendingChanges, capital] = await Promise.all([
    useCases.listMovements.execute({ groupId: group.id }),
    useCases.listGroupInstallments.execute({ groupId: group.id }),
    useCases.listPendingChanges.execute({ groupId: group.id }),
    useCases.getCapitalSummary.execute({ groupId: group.id }),
  ]);
  const overdueCount = installments.filter(
    (i) => i.status === "pending" && isOverdue(i.dueDate, today),
  ).length;
  const approvalsForMe = pendingChanges.filter((c) => c.proposedBy !== user.id);
  const pendingIds = pendingChanges.map((c) => c.movementId);

  return (
    <AppShell
      user={toUserView(user)}
      group={toGroupView(group)}
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
        {group.hasFreeSeat() && <InviteBanner code={group.inviteCode.value} />}
        <PendingApprovals items={approvalsForMe} />
        <PanelContent
          user={toUserView(user)}
          movements={movements}
          capital={capital}
          pendingIds={pendingIds}
          today={today}
        />
      </div>
    </AppShell>
  );
}
