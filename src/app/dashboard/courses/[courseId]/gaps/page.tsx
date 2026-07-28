import Link from "next/link";
import { KnowledgeScore } from "~/components/knowledge-score";
import { ScrollToTargetLink } from "~/components/scroll-to-target-link";
import { conciseTeachingText } from "~/lib/ai/presentation";
import type { GapReport, SpanStatus } from "~/lib/ai/schemas";
import { requireUser } from "~/lib/supabase/server";
import { cn } from "~/lib/utils";

type GapRow = {
  id: string;
  phrase: string;
  category: string;
  explanation: string | null;
  resolved: boolean;
  created_at: string;
};

type StoredSpan = {
  text: string;
  status: SpanStatus;
  issue: string | null;
};

type SessionReport = {
  id: string;
  transcript: string | null;
  score: number | null;
  spans: StoredSpan[] | null;
  report: GapReport | null;
  gaps: GapRow[];
};

function normalized(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function relatedWeakness(text: string, index: number, weaknesses: GapRow[]) {
  if (weaknesses.length === 0) return null;
  const spanText = normalized(text);
  const exact = weaknesses.find((weakness) => {
    const phrase = normalized(weakness.phrase);
    return (
      phrase.length > 0 &&
      (spanText.includes(phrase) || phrase.includes(spanText))
    );
  });
  return exact ?? weaknesses[index % weaknesses.length] ?? null;
}

export default async function GapReportPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { supabase, user } = await requireUser();

  const { data: session } = await supabase
    .from("course_sessions")
    .select(
      "id, transcript, score, spans, report, gaps ( id, phrase, category, explanation, resolved, created_at )",
    )
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .not("report", "is", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle<SessionReport>();

  if (!session?.report) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-subtle">
          No gap report yet. Explain the topic once and your score, transcript,
          strengths, and weaknesses will appear here.
        </p>
        <Link
          href={`/dashboard/courses/${courseId}/record`}
          className="w-fit rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Start explaining
        </Link>
      </div>
    );
  }

  const score = Math.round(session.score ?? session.report.score);
  const spans = session.spans ?? [];
  const weaknesses = (session.gaps ?? []) as GapRow[];
  const hasClassifiedClaim = spans.some(
    (span) => span.status === "correct" || span.status === "gap",
  );
  const markSubstantiveNeutralAsGap =
    score < 50 && weaknesses.length > 0 && !hasClassifiedClaim;

  return (
    <div className="flex flex-col gap-8">
      <KnowledgeScore score={score} verdict={session.report.verdict} />

      {session.transcript && spans.length > 0 && (
        <section
          aria-labelledby="transcript-heading"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="transcript-heading"
              className="text-base font-semibold text-strong"
            >
              Your transcript
            </h2>
            <div className="flex items-center gap-3 text-xs text-subtle">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-green-500" />
                Accurate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-500" />
                Needs work
              </span>
            </div>
          </div>
          <p className="max-w-3xl rounded-xl bg-surface p-4 text-sm leading-7 text-foreground">
            {spans.map((span, index) => {
              const substantive = span.text.trim().length > 0;
              const status =
                span.status === "neutral" &&
                substantive &&
                markSubstantiveNeutralAsGap
                  ? "gap"
                  : span.status;
              const weakness =
                status === "gap"
                  ? relatedWeakness(span.text, index, weaknesses)
                  : null;

              if (status === "gap" && weakness) {
                return (
                  <ScrollToTargetLink
                    // biome-ignore lint/suspicious/noArrayIndexKey: transcript spans are positional
                    key={`${index}-${span.text.slice(0, 16)}`}
                    targetId={`weakness-${weakness.id}`}
                    title={span.issue ?? "Jump to this weakness"}
                    className="rounded bg-red-500/10 text-red-600 transition-colors hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:text-red-400"
                  >
                    {span.text}
                  </ScrollToTargetLink>
                );
              }

              return (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: transcript spans are positional
                  key={`${index}-${span.text.slice(0, 16)}`}
                  className={cn(
                    status === "correct" &&
                      "text-green-600 dark:text-green-400",
                    status === "neutral" && "text-subtle",
                  )}
                >
                  {span.text}
                </span>
              );
            })}
          </p>
          <p className="text-xs text-subtle">
            Select any red text to jump to the matching explanation.
          </p>
        </section>
      )}

      <section
        aria-labelledby="strengths-heading"
        className="flex flex-col gap-3"
      >
        <h2
          id="strengths-heading"
          className="text-base font-semibold text-strong"
        >
          Knowledge strengths
        </h2>
        {session.report.strengths.length > 0 ? (
          <ul className="flex max-w-3xl flex-col gap-2">
            {session.report.strengths.map((strength) => (
              <li
                key={strength}
                className="flex gap-2 text-sm leading-6 text-foreground"
              >
                <span
                  aria-hidden
                  className="mt-2 size-2 shrink-0 rounded-full bg-green-500"
                />
                {strength}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-subtle">
            No clear strengths were demonstrated in this explanation yet.
          </p>
        )}
      </section>

      <section
        aria-labelledby="weaknesses-heading"
        className="flex flex-col gap-3"
      >
        <div>
          <h2
            id="weaknesses-heading"
            className="text-base font-semibold text-strong"
          >
            Knowledge weaknesses
          </h2>
          <p className="mt-1 text-sm text-subtle">
            Review one concept at a time.
          </p>
        </div>

        {weaknesses.length > 0 ? (
          <div className="divide-y divide-border border-y border-border">
            {weaknesses.map((weakness) => (
              <article
                id={`weakness-${weakness.id}`}
                key={weakness.id}
                tabIndex={-1}
                className="flex scroll-mt-24 flex-col gap-2 py-4 outline-none target:bg-red-500/[0.04]"
              >
                <p className="text-xs font-medium text-red-600 capitalize dark:text-red-400">
                  {weakness.category.replace(/_/g, " ")}
                </p>
                <h3 className="text-sm font-semibold text-strong">
                  {weakness.phrase}
                </h3>
                <Link
                  href={`/dashboard/courses/${courseId}/re-teach#gap-${weakness.id}`}
                  className="w-fit rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-strong transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Re-teach this
                </Link>
                {weakness.explanation && (
                  <p className="max-w-2xl text-sm leading-6 text-foreground">
                    {conciseTeachingText(weakness.explanation)}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-subtle">
            No weaknesses were flagged in this explanation.
          </p>
        )}
      </section>
    </div>
  );
}
