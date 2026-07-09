import { requireUser } from "@/backend/modules/accounts/current-user";
import { findGroupOf } from "@/backend/modules/groups/data";
import { listGroupInstallments } from "@/backend/modules/loans/data";
import { listMovements } from "@/backend/modules/movements/data";
import { Dashboard } from "@/components/dashboard/dashboard";
import { Onboarding } from "@/components/onboarding/onboarding";
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
  const [movements, installments] = await Promise.all([
    listMovements(group.id),
    listGroupInstallments(group.id),
  ]);
  const overdueCount = installments.filter(
    (i) => i.status === "pending" && isOverdue(i.dueDate, today),
  ).length;

  return (
    <Dashboard
      user={user}
      group={group}
      movements={movements}
      installments={installments}
      overdueCount={overdueCount}
      today={today}
    />
  );
}
