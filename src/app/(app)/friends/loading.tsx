import { Skeleton } from "~/components/ui/skeleton";

/**
 * Stands in while the friend list and the requests are being fetched.
 *
 * Same gutter, same grid and roughly the same block heights as the real
 * screen, so nothing jumps sideways or downwards when the data lands. A
 * placeholder shaped like a different page is worse than none, because the
 * layout visibly rearranges itself the moment it is replaced.
 */
export default function FriendsLoading() {
  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 pt-8 pb-32 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-5 w-[min(26rem,80vw)]" />
        </div>
        <Skeleton className="h-11 w-full rounded-pill sm:w-[25rem]" />
      </div>
      <div className="mt-8 grid items-start gap-4 min-[75rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-[22rem] rounded-card" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[11rem] rounded-card" />
          <Skeleton className="h-[9.5rem] rounded-card" />
        </div>
      </div>
    </div>
  );
}
