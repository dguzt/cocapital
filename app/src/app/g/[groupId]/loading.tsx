import { ShellSkeleton } from "@/components/shell/shell-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="grid gap-5 md:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      </div>
    </ShellSkeleton>
  );
}
