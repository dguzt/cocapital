import { ShellSkeleton } from "@/components/shell/shell-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
        {["a", "b", "c", "d"].map((k) => (
          <Skeleton key={k} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 max-w-3xl rounded-2xl" />
    </ShellSkeleton>
  );
}
