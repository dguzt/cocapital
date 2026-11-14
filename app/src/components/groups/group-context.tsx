"use client";

import { createContext, useContext } from "react";
import { groupPath } from "@/lib/group-path";

type CurrentGroup = {
  groupId: string;
  alone: boolean;
};

const GroupContext = createContext<CurrentGroup | null>(null);

export function GroupProvider({
  value,
  children,
}: {
  value: CurrentGroup;
  children: React.ReactNode;
}) {
  return <GroupContext value={value}>{children}</GroupContext>;
}

/**
 * Reads the group the page is showing.
 *
 * @returns Its id, whether the partner is alone in it, and a builder for
 *   links inside it.
 * @throws When used outside a group's pages.
 */
export function useGroup() {
  const group = useContext(GroupContext);

  if (!group) {
    throw new Error("useGroup must be used inside a GroupProvider");
  }

  return {
    ...group,
    href: (path = "") => groupPath(group.groupId, path),
  };
}
