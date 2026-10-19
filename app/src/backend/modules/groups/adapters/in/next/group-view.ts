import type { Group } from "@/backend/modules/groups/domain/group";

/** A group as a plain object — the only shape a Client Component can receive. */
export type GroupView = {
  id: string;
  name: string;
  inviteCode: string;
  members: {
    id: string;
    name: string;
    role: "creator" | "member";
  }[];
};

/**
 * Turns the Group entity into its plain view for the UI.
 *
 * @param group - The entity.
 * @returns The same group as plain data.
 */
export function toGroupView(group: Group): GroupView {
  return {
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode.value,
    members: group.members.map((member) => ({
      id: member.userId,
      name: member.name,
      role: member.role,
    })),
  };
}
