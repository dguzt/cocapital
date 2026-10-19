import { useCases } from "@/backend/application/container";
import { requireUser } from "@/backend/modules/accounts/adapters/in/next/session";
import { toUserView } from "@/backend/modules/accounts/adapters/in/next/user-view";
import { toGroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { LoanWizard } from "@/components/loans/loan-wizard/loan-wizard";
import { AppShell } from "@/components/shell/app-shell";
import { isOverdue, todayInLima } from "@/lib/dates";

export default async function NewLoanPage() {
  const user = await requireUser();
  const group = await useCases.getMyGroup.execute({ userId: user.id });
  if (!group) return null;
  const today = todayInLima();
  const [borrowers, installments] = await Promise.all([
    useCases.listBorrowers.execute({ groupId: group.id }),
    useCases.listGroupInstallments.execute({ groupId: group.id }),
  ]);
  const overdueCount = installments.filter(
    (i) => i.status === "pending" && isOverdue(i.dueDate, today),
  ).length;

  return (
    <AppShell
      user={toUserView(user)}
      group={toGroupView(group)}
      active="loans"
      overdueCount={overdueCount}
      title="Nuevo préstamo"
      subtitle="El cronograma se calcula solo — tú solo confirmas"
    >
      <div className="max-w-2xl">
        <LoanWizard borrowers={borrowers} />
      </div>
    </AppShell>
  );
}
