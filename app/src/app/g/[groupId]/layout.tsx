import { requireMembership } from "@/backend/modules/groups/adapters/in/next/membership";

export default async function GroupLayout({
  params,
  children,
}: LayoutProps<"/g/[groupId]">) {
  const { groupId } = await params;

  await requireMembership(groupId);

  return children;
}
