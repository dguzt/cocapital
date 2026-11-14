import { ShellSkeleton } from "@/components/shell/shell-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <Skeleton className="h-96 max-w-4xl rounded-2xl" />
    </ShellSkeleton>
  );
}
