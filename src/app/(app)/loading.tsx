import { Skeleton } from "~/components/ui/skeleton";

/**
 * Shown while a dashboard route's server work is in flight. Without this the
 * app appears to hang on the old page and then snap to the new one; with it,
 * the click has a visible consequence immediately.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="aspect-square rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
