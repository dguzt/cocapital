import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import type { GroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { MemberAvatars } from "@/components/groups/member-avatars";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/dictionaries";
import { groupPath } from "@/lib/group-path";

export function GroupList({
  userName,
  groups,
  t,
}: {
  userName: string;
  groups: GroupView[];
  t: Dictionary["groups"];
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-emerald-400 font-mono font-semibold text-emerald-950 shadow-lg shadow-emerald-400/25">
            S/
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.hello(userName)}
          </h1>
          <p className="text-muted-foreground text-sm">{t.pickGroup}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={groupPath(group.id)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-emerald-400/40"
              >
                <span className="w-14 shrink-0">
                  <MemberAvatars members={group.members} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {group.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t.members(group.members.length)}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>

        <Button asChild variant="outline" className="w-full">
          <Link href="/grupos/nuevo">
            <Plus className="size-4" /> {t.createAnother}
          </Link>
        </Button>
      </div>
    </main>
  );
}
