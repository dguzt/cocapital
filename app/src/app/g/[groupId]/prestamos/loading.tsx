import { ShellSkeleton } from "@/components/shell/shell-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      {["a", "b", "c"].map((k) => (
        <Skeleton key={k} className="h-20 max-w-2xl rounded-2xl" />
      ))}
    </ShellSkeleton>
  );
}
