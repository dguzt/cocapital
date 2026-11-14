import { redirect } from "next/navigation";
import { useCases } from "@/backend/application/container";
import { getCurrentUser } from "@/backend/modules/accounts/adapters/in/next/session";
import { toGroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { GroupList } from "@/components/groups/group-list";
import { Landing } from "@/components/landing/landing";
import { Onboarding } from "@/components/onboarding/onboarding";
import { groupPath } from "@/lib/group-path";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    return <Landing />;
  }

  const groups = await useCases.listMyGroups.execute({ userId: user.id });

  if (groups.length === 0) {
    return <Onboarding userName={user.name} />;
  }

  if (groups.length === 1) {
    redirect(groupPath(groups[0].id));
  }

  return <GroupList userName={user.name} groups={groups.map(toGroupView)} />;
}
