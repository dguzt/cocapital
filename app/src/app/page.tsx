import { requireUser } from "@/backend/modules/accounts/current-user";
import { findGroupOf } from "@/backend/modules/groups/data";
import { listMovements } from "@/backend/modules/movements/data";
import { Dashboard } from "@/components/dashboard/dashboard";
import { Onboarding } from "@/components/onboarding/onboarding";
import { todayInLima } from "@/lib/dates";

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

  const movements = await listMovements(group.id);
  return (
    <Dashboard
      user={user}
      group={group}
      movements={movements}
      today={todayInLima()}
    />
  );
}
