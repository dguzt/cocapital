/**
 * The app frame from the Claude Design desktop prototype: 256px sidebar
 * (brand · group chip · nav with overdue badge · user card) + topbar with
 * page title/actions. On mobile the sidebar collapses to a compact header.
 */
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { Activity, LayoutGrid, LogOut, Package } from "lucide-react";
import Link from "next/link";
import type { SessionUser } from "@/backend/modules/accounts/current-user";
import type { GroupWithMembers } from "@/backend/modules/groups/data";
import { MobileMenu } from "@/components/shell/mobile-menu";
import { Button } from "@/components/ui/button";

export type NavKey = "panel" | "loans" | "activity";

const NAV: {
  key: NavKey;
  href: string;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "panel",
    href: "/",
    label: "Panel",
    icon: <LayoutGrid className="size-[18px]" />,
  },
  {
    key: "loans",
    href: "/prestamos",
    label: "Préstamos",
    icon: <Package className="size-[18px]" />,
  },
  {
    key: "activity",
    href: "/actividad",
    label: "Actividad",
    icon: <Activity className="size-[18px]" />,
  },
];

function Avatar({ name, accent }: { name: string; accent?: boolean }) {
  return (
    <span
      className={`flex size-6 items-center justify-center rounded-full border-2 border-card text-[11px] font-semibold ${
        accent ? "bg-emerald-400 text-emerald-950" : "bg-zinc-500 text-white"
      }`}
    >
      {name[0]?.toUpperCase()}
    </span>
  );
}

export function AppShell({
  user,
  group,
  active,
  overdueCount,
  title,
  subtitle,
  actions,
  children,
}: {
  user: SessionUser;
  group: GroupWithMembers;
  active: NavKey;
  overdueCount: number;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* sidebar — desktop only */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar p-4 md:flex">
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-400 font-mono text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-400/25">
            S/
          </span>
          <span className="text-lg font-semibold tracking-tight">
            cocapital
          </span>
        </div>

        <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <span className="flex">
            {group.members.map((m, i) => (
              <span key={m.id} className={i > 0 ? "-ml-2" : ""}>
                <Avatar name={m.name} accent={i === 0} />
              </span>
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">
              {group.name}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,.15)]" />
              {group.members.length} socio
              {group.members.length === 1 ? "" : "s"}
            </span>
          </span>
        </div>

        <nav className="mt-3.5 flex flex-col gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition-colors ${
                active === item.key
                  ? "bg-emerald-400/15 font-semibold text-foreground [&_svg]:text-emerald-400"
                  : "text-muted-foreground hover:bg-card [&_svg]:text-zinc-500"
              }`}
            >
              {item.icon}
              {item.label}
              {item.key === "loans" && overdueCount > 0 && (
                <span className="ml-auto rounded-full bg-red-400/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-red-400">
                  {overdueCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-2.5 border-t border-border pt-3">
          <UserButton />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold">
              {user.name}
            </span>
            <span className="block truncate text-[11.5px] text-muted-foreground">
              {user.email}
            </span>
          </span>
          <SignOutButton>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              title="Cerrar sesión"
            >
              <LogOut className="size-[15px]" />
            </Button>
          </SignOutButton>
        </div>
      </aside>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile header */}
        <header className="flex items-center gap-3 border-b border-border p-4 md:hidden">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-400 font-mono text-sm font-semibold text-emerald-950">
            S/
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{group.name}</p>
            <p className="text-[12px] text-muted-foreground">{title}</p>
          </div>
          <MobileMenu
            items={NAV.map(({ key, href, label }) => ({ key, href, label }))}
            active={active}
            overdueCount={overdueCount}
            userName={user.name}
            userEmail={user.email}
          />
        </header>

        {/* desktop topbar */}
        <div className="hidden h-[72px] shrink-0 items-center gap-4 border-b border-border px-8 md:flex">
          <div className="flex-1">
            <h1 className="text-[23px] font-bold tracking-tight">{title}</h1>
            <p className="text-[13px] text-muted-foreground">{subtitle}</p>
          </div>
          {actions}
        </div>

        <main className="flex-1 overflow-auto p-4 pb-24 md:px-8 md:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
