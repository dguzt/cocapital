import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 p-4 pt-8 md:p-8">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-13 rounded-lg" />
    </div>
  );
}
