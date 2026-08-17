import { Skeleton } from "~/components/ui/skeleton";

/**
 * Shown while a dashboard route's server work is in flight. Without this the
 * app appears to hang on the old page and then snap to the new one; with it,
 * the click has a visible consequence immediately.
 *
 * It stands on the same gutter and the same measure as the screens it stands
 * in for, so the page does not jump sideways when the real thing arrives.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[var(--measure)] flex-col gap-stack px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-card" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    </div>
  );
}
