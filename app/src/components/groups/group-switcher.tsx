"use client";

import { Check, ChevronsUpDown, Link2, Plus } from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { toast } from "sonner";
import type { GroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { MemberAvatars } from "@/components/groups/member-avatars";
import { groupPath } from "@/lib/group-path";
import { membersLabel } from "@/lib/members-label";

export function GroupSwitcher({
  group,
  groups,
  sectionPath,
  compact = false,
}: {
  group: GroupView;
  groups: { id: string; name: string; memberCount: number }[];
  sectionPath: string;
  compact?: boolean;
}) {
  const full = group.members.length >= group.capacity;

  async function copyInvite() {
    const link = `${window.location.origin}/join/${group.inviteCode}`;

    try {
      await navigator.clipboard.writeText(link);

      toast.success("Enlace de invitación copiado");
    } catch {
      toast.message(link);
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={
          compact
            ? "flex min-w-0 flex-1 items-center gap-1.5 text-left"
            : "flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-emerald-400/40"
        }
        aria-label="Cambiar de grupo"
      >
        {!compact && <MemberAvatars members={group.members} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{group.name}</span>
          {!compact && (
            <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,.15)]" />
              {membersLabel(group.members.length)}
            </span>
          )}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-64 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
        >
          <DropdownMenu.Label className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tus grupos
          </DropdownMenu.Label>

          {groups.map((item) => (
            <DropdownMenu.Item key={item.id} asChild>
              <Link
                href={groupPath(item.id, sectionPath)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-accent"
              >
                <Check
                  className={`size-4 text-emerald-400 ${item.id === group.id ? "" : "invisible"}`}
                />
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {item.memberCount}/{group.capacity}
                </span>
              </Link>
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            disabled={full}
            onSelect={copyInvite}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent"
          >
            <Link2 className="size-4" />
            {full
              ? `Grupo lleno (${group.capacity}/${group.capacity})`
              : "Copiar enlace de invitación"}
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/grupos/nuevo"
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-accent"
            >
              <Plus className="size-4" />
              Crear otro grupo
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
