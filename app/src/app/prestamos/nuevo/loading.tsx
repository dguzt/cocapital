import { ShellSkeleton } from "@/components/shell/shell-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <Skeleton className="h-96 max-w-2xl rounded-2xl" />
      <Skeleton className="h-13 max-w-2xl rounded-lg" />
    </ShellSkeleton>
  );
}
