import Link from "next/link";
import { cn } from "~/lib/utils";

export type GradedSession = {
  id: string;
  started_at: string;
  score: number | null;
  mode: string | null;
};

/**
 * Which recording you are reading.
 *
 * The gap report and Re-Teach used to show whichever session was newest, with
 * no way to reach any other — so recording again made every earlier attempt
 * unreadable. That is backwards for a product whose whole proposition is
 * explaining the same thing twice and seeing what changed.
 *
 * A row of links rather than a dropdown: the scores are the interesting part
 * and they should be visible at once, not one at a time behind a click.
 */
export function SessionPicker({
  sessions,
  current,
  courseId,
  basePath,
}: {
  sessions: GradedSession[];
  current: string;
  courseId: string;
  /** Which screen these link to — the picker is shared by both. */
  basePath: "gaps" | "re-teach";
}) {
  return (
    <nav
      aria-label="Past recordings"
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4"
    >
      <p className="font-mono text-[10px] tracking-[0.14em] text-subtle uppercase">
        Past recordings · {sessions.length}
      </p>

      <ul className="flex flex-wrap gap-2">
        {sessions.map((session) => {
          const active = session.id === current;
          return (
            <li key={session.id}>
              <Link
                href={`/dashboard/courses/${courseId}/${basePath}?session=${session.id}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col gap-0.5 rounded-lg border px-3 py-2 transition-colors",
                  active
                    ? "border-brand/40 bg-brand/[0.08]"
                    : "border-border hover:border-brand/25",
                )}
              >
                <span className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-mono text-lg font-semibold tabular-nums",
                      active ? "text-brand" : "text-strong",
                    )}
                  >
                    {session.score ?? "—"}
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.1em] text-subtle uppercase">
                    {session.mode === "interview" ? "Interview" : "Topic"}
                  </span>
                </span>
                <span className="text-[11px] text-subtle">
                  {new Date(session.started_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                  {" · "}
                  {new Date(session.started_at).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
