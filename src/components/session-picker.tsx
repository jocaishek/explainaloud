"use client";

import { useRouter } from "next/navigation";
import { cn } from "~/lib/utils";

export type GradedSession = {
  id: string;
  started_at: string;
  score: number | null;
  mode: string | null;
};

function label(session: GradedSession) {
  const when = new Date(session.started_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const mode = session.mode === "interview" ? "Interview" : "Topic";
  return `${when} · ${mode} · ${session.score ?? "—"}/100`;
}

/**
 * Which recording you are reading.
 *
 * A dropdown rather than a row of cards: past sessions accumulate, and a row
 * that grows without limit pushes the report itself off the screen — which is
 * the thing you came to read. A select stays one line at ten sessions and at
 * a hundred, and on a phone it opens the platform's own picker.
 */
export function SessionPicker({
  sessions,
  current,
  slug,
  basePath,
}: {
  sessions: GradedSession[];
  current: string;
  /** The course's URL segment — the picker only ever builds links. */
  slug: string;
  /** Which screen these link to — the picker is shared by both. */
  basePath: "gaps" | "re-teach";
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        htmlFor="session-picker"
        className="font-mono text-[10px] tracking-[0.14em] text-subtle uppercase"
      >
        Recording
      </label>
      <select
        id="session-picker"
        value={current}
        onChange={(event) => {
          router.push(
            `/home/${slug}/${basePath}?session=${event.target.value}`,
          );
        }}
        className={cn(
          "min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2",
          "text-sm text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        )}
      >
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {label(session)}
          </option>
        ))}
      </select>
    </div>
  );
}
