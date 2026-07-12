import { requireUser } from "@/backend/modules/accounts/current-user";
import { findGroupOf } from "@/backend/modules/groups/data";
import { listBorrowers } from "@/backend/modules/loans/usecases/list-borrowers";
import { listGroupInstallments } from "@/backend/modules/loans/usecases/list-group-installments";
import { LoanWizard } from "@/components/loans/loan-wizard";
import { AppShell } from "@/components/shell/app-shell";
import { isOverdue, todayInLima } from "@/lib/dates";

export default async function NewLoanPage() {
  const user = await requireUser();
  const group = await findGroupOf(user.id);
  if (!group) return null;
  const today = todayInLima();
  const [borrowers, installments] = await Promise.all([
    listBorrowers(group.id),
    listGroupInstallments(group.id),
  ]);
  const overdueCount = installments.filter(
    (i) => i.status === "pending" && isOverdue(i.dueDate, today),
  ).length;

  return (
    <AppShell
      user={user}
      group={group}
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
