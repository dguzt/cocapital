"use client";
/** The mobile hamburger (D3 #7): full nav + user card in a bottom drawer. */
import { SignOutButton, UserButton } from "@clerk/nextjs";
import {
  Activity,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const ICONS = {
  panel: <LayoutGrid className="size-5" />,
  loans: <Package className="size-5" />,
  sales: <ShoppingBag className="size-5" />,
  activity: <Activity className="size-5" />,
} as const;

export function MobileMenu({
  items,
  active,
  overdueCount,
  userName,
  userEmail,
}: {
  items: { key: keyof typeof ICONS; href: string; label: string }[];
  active: string;
  overdueCount: number;
  userName: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Menú">
          <Menu className="size-6" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-4 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle>Menú</DrawerTitle>
          </DrawerHeader>
          <nav className="flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-base font-medium ${
                  active === item.key
                    ? "bg-emerald-400/15 font-semibold text-foreground [&_svg]:text-emerald-400"
                    : "text-muted-foreground [&_svg]:text-zinc-500"
                }`}
              >
                {ICONS[item.key]}
                {item.label}
                {item.key === "loans" && overdueCount > 0 && (
                  <span className="ml-auto rounded-full bg-red-400/15 px-2 py-0.5 font-mono text-xs font-semibold text-red-400">
                    {overdueCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            {/* Clerk's account modal: profile, security, connected accounts */}
            <UserButton />

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {userName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {userEmail}
              </span>
            </span>
            <SignOutButton>
              <Button variant="outline" size="sm">
                <LogOut className="size-4" /> Salir
              </Button>
            </SignOutButton>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
