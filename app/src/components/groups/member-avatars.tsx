import type { GroupView } from "@/backend/modules/groups/adapters/in/next/group-view";

const MAX_SHOWN = 4;

export function MemberAvatars({ members }: { members: GroupView["members"] }) {
  return (
    <span className="flex shrink-0">
      {members.slice(0, MAX_SHOWN).map((member, i) => (
        <span
          key={member.id}
          className={`flex size-6 items-center justify-center rounded-full border-2 border-card text-[11px] font-semibold ${
            i > 0 ? "-ml-2" : ""
          } ${i === 0 ? "bg-emerald-400 text-emerald-950" : "bg-zinc-500 text-white"}`}
        >
          {member.name[0]?.toUpperCase()}
        </span>
      ))}
      {members.length > MAX_SHOWN && (
        <span className="-ml-2 flex size-6 items-center justify-center rounded-full border-2 border-card bg-zinc-700 text-[10px] font-semibold text-white">
          +{members.length - MAX_SHOWN}
        </span>
      )}
    </span>
  );
}
