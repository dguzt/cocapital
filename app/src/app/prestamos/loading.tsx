import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 p-4 pt-8 md:p-8">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      {["a", "b", "c"].map((k) => (
        <Skeleton key={k} className="h-20 rounded-2xl" />
      ))}
    </div>
  );
}
