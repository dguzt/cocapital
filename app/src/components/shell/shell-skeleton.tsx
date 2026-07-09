import { Skeleton } from "@/components/ui/skeleton";

/** Shared route skeleton in the shell's shape: sidebar strip + topbar + body. */
export function ShellSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden h-screen w-64 shrink-0 flex-col gap-4 border-r border-border bg-sidebar p-4 md:flex">
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <Skeleton className="size-9 rounded-xl" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-14 rounded-xl" />
        {["a", "b", "c"].map((k) => (
          <Skeleton key={k} className="h-10 rounded-xl" />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="hidden h-[72px] items-center border-b border-border px-8 md:flex">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="animate-pulse space-y-5 p-4 md:px-8 md:py-7">
          {children}
        </div>
      </div>
    </div>
  );
}
