import { requireUser } from "@/backend/modules/accounts/current-user";
import { findGroupOf } from "@/backend/modules/groups/data";
import { Dashboard } from "@/components/dashboard/dashboard";
import { Onboarding } from "@/components/onboarding/onboarding";

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
  return <Dashboard user={user} group={group} />;
}
