import { ScrollReveal } from "~/components/scroll-reveal";

/**
 * Wraps every screen in the app.
 *
 * **No route transition.** There was one, and it was removed: a fade on
 * navigation delayed every tab until after its data had already arrived, which
 * made fast responses feel slow. Motion that costs latency is not polish.
 *
 * **One reveal observer, mounted here.** A template re-mounts on every
 * navigation, which is exactly what this needs — it re-queries for
 * `data-rise` blocks on the screen somebody just arrived at, rather than
 * observing the first screen of the session and nothing after it. Screens
 * without any of those blocks pay for one `querySelectorAll` that finds
 * nothing and returns.
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full">
      <ScrollReveal />
      {children}
    </div>
  );
}
