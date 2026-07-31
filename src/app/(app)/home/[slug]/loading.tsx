import { Skeleton } from "~/components/ui/skeleton";

/**
 * Keeps the course header and tabs interactive while the selected tab's
 * server data streams in. This boundary also lets Next.js prefetch the shared
 * course shell instead of waiting for the entire dynamic route.
 */
export default function CourseTabLoading() {
  return (
    <div
      aria-label="Loading course tab"
      className="mx-auto flex w-full max-w-2xl flex-col gap-4"
      role="status"
    >
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
