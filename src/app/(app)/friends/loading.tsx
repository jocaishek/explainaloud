import { Skeleton } from "~/components/ui/skeleton";

/**
 * Stands in while the friend list and the requests are being fetched.
 *
 * Same gutter, same measure and roughly the same block heights as the real
 * screen, so nothing jumps sideways or downwards when the data lands. The
 * generic dashboard skeleton sits one level up and draws a stat row and a
 * two-panel grid, neither of which this page has — a placeholder shaped like a
 * different page is worse than none, because the layout visibly rearranges
 * itself the moment it is replaced.
 */
export default function FriendsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[var(--measure)] flex-col gap-stack px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-full max-w-[34rem]" />
      </div>
      <Skeleton className="h-[6.5rem] rounded-card" />
      <Skeleton className="h-[13rem] rounded-card" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[11.5rem] rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
