"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentOrchestration } from "~/components/agent-orchestration";
import {
  SCOPE_OPTIONS,
  SCOPE_QUESTION,
  SourceScopeOption,
} from "~/components/source-scope-choice";
import { type SourceItem, SourceUploader } from "~/components/source-uploader";
import { Button } from "~/components/ui/button";
import type { CourseCitation, GeneratedCourse } from "~/lib/ai/schemas";
import { requestJson } from "~/lib/api-client";
import { courseSectionId } from "~/lib/course-sections";
import {
  directLearningWebsite,
  looksLikeEnglishText,
} from "~/lib/link-quality";

const EASE = [0.23, 1, 0.32, 1] as const;

export function CourseBuilder({
  courseId,
  slug,
  initialSources,
  initialCourse,
  initialSourcesOnly = false,
  unlimited = false,
}: {
  courseId: string;
  /** The course's URL segment. Links use it; API calls use the id. */
  slug: string;
  initialSources: SourceItem[];
  initialCourse: GeneratedCourse | null;
  /** How this course was last built: strictly from its files, or not. */
  initialSourcesOnly?: boolean;
  /** Admins bypass the per-topic source cap. */
  unlimited?: boolean;
}) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [sourcesOnly, setSourcesOnly] = useState(initialSourcesOnly);
  const [course, setCourse] = useState(initialCourse);
  const [generating, setGenerating] = useState(false);
  const [findingLinks, setFindingLinks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Course sections render inside an entrance animation. A browser hash jump
  // can fire before that content settles, so repeat it once the section is in
  // its final position.
  useEffect(() => {
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    if (!targetId.startsWith("course-section-") || !course) return;

    const timer = window.setTimeout(() => {
      const target = document.getElementById(targetId);
      target?.scrollIntoView({ behavior: "instant", block: "start" });
      target?.focus({ preventScroll: true });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [course]);

  async function generate() {
    setGenerating(true);
    setError(null);
    const result = await requestJson<{
      course: GeneratedCourse;
      detail?: string;
    }>(`/api/courses/${courseId}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Sent every build so the switch below takes effect immediately, rather
      // than only on courses created after it existed.
      body: JSON.stringify({ sourcesOnly: sourcesOnly && sources.length > 0 }),
    });

    if (result.ok) {
      setCourse(result.data.course);
      router.refresh();
    } else {
      // `detail` is only present for admins — the server decides that, not the
      // client. Appending it means a failed build is diagnosable from the
      // screen instead of the hosting provider's log viewer.
      setError(result.error);
    }
    setGenerating(false);
  }

  async function findLearningLinks(refresh = false) {
    setFindingLinks(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/courses/${courseId}/videos${refresh ? "?refresh=1" : ""}`,
        { method: "POST" },
      );
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Couldn't find direct learning links.");
      } else {
        setCourse((current) =>
          current
            ? {
                ...current,
                videos: Array.isArray(json.videos)
                  ? json.videos
                  : current.videos,
                resources: Array.isArray(json.resources)
                  ? json.resources
                  : current.resources,
              }
            : current,
        );
        router.refresh();
      }
    } catch {
      setError("Couldn't reach learning-link search.");
    }
    setFindingLinks(false);
  }

  const englishVideos =
    course?.videos.filter((video) => looksLikeEnglishText(video.title)) ?? [];
  const directResources =
    course?.resources.filter(
      (resource) => resource.url && directLearningWebsite(resource.url),
    ) ?? [];
  const citationEntries = course ? collectCitations(course) : [];
  const citationNumbers = new Map(
    citationEntries.map((citation, index) => [
      citationKey(citation),
      index + 1,
    ]),
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand-ink uppercase">
            Your sources
          </h2>
          <p className="mt-1.5 text-sm text-subtle">
            {sources.length > 0
              ? "The course is grounded in these sources."
              : course?.citations.length
                ? "Explainaloud researched direct sources and cites them throughout this course."
                : "Sources are optional. Without them, the course uses established textbook knowledge."}
          </p>
        </div>
        <SourceUploader
          courseId={courseId}
          initialSources={sources}
          onChange={setSources}
          unlimited={unlimited}
        />

        {/* Shown only with files present: with nothing uploaded there is
            nothing to be strict about, and the course has to come from
            somewhere. */}
        {sources.length > 0 && (
          <fieldset
            disabled={generating}
            className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 disabled:opacity-60"
          >
            <legend className="px-1 text-sm font-semibold text-strong">
              {SCOPE_QUESTION}
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              <SourceScopeOption
                name="course-source-scope"
                value="off"
                checked={!sourcesOnly}
                onSelect={() => setSourcesOnly(false)}
                {...SCOPE_OPTIONS.open}
              />
              <SourceScopeOption
                name="course-source-scope"
                value="on"
                checked={sourcesOnly}
                onSelect={() => setSourcesOnly(true)}
                {...SCOPE_OPTIONS.strict}
              />
            </div>
            {sourcesOnly !== initialSourcesOnly && course && (
              <p className="text-xs leading-5 text-subtle">
                Rebuild the course for this to take effect.
              </p>
            )}
          </fieldset>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={generate}
          disabled={generating}
          className="h-11 gap-2 rounded-full bg-accent-solid px-6 font-semibold text-accent-contrast shadow-[0_0_30px_-8px_var(--color-brand-deep)] transition-transform duration-200 ease-out hover:bg-accent-solid-hover active:scale-[0.97] disabled:opacity-50"
        >
          {generating
            ? "Reading your sources…"
            : course
              ? "Rebuild the course"
              : "Build my course"}
        </Button>

        {course && (
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-full border-input"
          >
            <Link href={`/home/${slug}/record`}>Start explaining</Link>
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <AgentOrchestration run={course?.orchestration} running={generating} />

      <AnimatePresence>
        {course && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="flex flex-col gap-8"
          >
            {/* Broad topics still get a course. They just grade badly, because
                the key points spread across a whole field and a good
                explanation of one corner scores like a poor explanation of all
                of it. Saying so here turns a confusing score into an
                understood one, before the recording rather than after it. */}
            {course.scope_note && (
              <aside className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
                <p className="text-sm font-semibold text-strong">
                  This topic is quite broad
                </p>
                <p className="mt-2 text-sm leading-6 text-subtle">
                  {course.scope_note.reason} You can still record an explanation
                  and the course below is yours to use, but expect a lower score
                  than a narrower topic would give you.
                </p>
                {course.scope_note.suggestions.length > 0 && (
                  <p className="mt-3 text-sm leading-6 text-subtle">
                    Sharper next time:{" "}
                    {course.scope_note.suggestions.map((suggestion, index) => (
                      <span key={suggestion}>
                        {index > 0 && ", "}
                        <span className="font-medium text-strong">
                          {suggestion}
                        </span>
                      </span>
                    ))}
                    .
                  </p>
                )}
              </aside>
            )}

            <div className="text-foreground">
              <p>{course.summary}</p>
              <CitationMarks
                citations={course.citations}
                numbers={citationNumbers}
                label="Sources for the course overview"
              />
            </div>

            {course.notes.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand-ink uppercase">
                  Notes
                </h2>
                <ul className="flex flex-col gap-2">
                  {course.notes.map((note) => (
                    <li
                      key={note}
                      className="flex gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                    >
                      <span aria-hidden className="text-brand-ink">
                        —
                      </span>
                      {note}
                    </li>
                  ))}
                </ul>
                <CitationMarks
                  citations={course.citations}
                  numbers={citationNumbers}
                  label="Sources for the revision notes"
                />
              </section>
            )}

            {course.sections.map((section, i) => (
              <section
                id={courseSectionId(i)}
                key={section.title}
                tabIndex={-1}
                className="flex scroll-mt-24 flex-col gap-3"
              >
                <h3 className="flex items-baseline gap-3 text-lg font-semibold text-strong">
                  <span className="font-mono text-[11px] text-brand-ink">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {section.title}
                </h3>
                <Field label="Intuition" body={section.intuition} />
                <Field label="Analogy" body={section.analogy} />
                <Field label="Technical" body={section.technical} />
                <Field label="Example" body={section.example} />
                <p className="rounded-lg border border-brand/20 bg-brand/[0.06] px-3 py-2 text-sm font-medium text-strong">
                  {section.quiz}
                </p>
                <CitationMarks
                  citations={section.citations}
                  numbers={citationNumbers}
                  label={`Sources for ${section.title}`}
                />
              </section>
            ))}

            {englishVideos.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand-ink uppercase">
                  Watch
                </h2>
                <div className="flex flex-col gap-2">
                  {englishVideos.map((video) => (
                    <a
                      key={video.url}
                      href={video.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors hover:border-brand/40 hover:text-strong"
                    >
                      <span className="min-w-0 flex-1">{video.title}</span>
                      <span
                        aria-hidden
                        className="shrink-0 font-mono text-[10px] text-subtle"
                      >
                        YOUTUBE ↗
                      </span>
                    </a>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={findingLinks}
                  onClick={() => findLearningLinks(true)}
                  className="w-fit rounded-full text-subtle"
                >
                  {findingLinks
                    ? "Checking links…"
                    : "Refresh videos & websites"}
                </Button>
              </section>
            ) : course.video_searches.length > 0 ? (
              <section className="flex flex-col items-start gap-2">
                <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand-ink uppercase">
                  Watch
                </h2>
                <p className="text-sm text-subtle">
                  Find direct videos matched to this course. This uses one basic
                  search credit and saves the results.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={findingLinks}
                  onClick={() => findLearningLinks()}
                  className="rounded-full"
                >
                  {findingLinks ? "Finding links…" : "Find videos & websites"}
                </Button>
              </section>
            ) : null}

            {directResources.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand-ink uppercase">
                  Go deeper
                </h2>
                <div className="flex flex-col gap-2">
                  {directResources.map((resource) => (
                    <a
                      key={resource.url}
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2 transition-colors hover:border-brand/40"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-strong">
                          {resource.label}
                        </span>
                        {resource.why && (
                          <span className="mt-0.5 block text-xs text-subtle">
                            {resource.why}
                          </span>
                        )}
                      </span>
                      <span
                        aria-hidden
                        className="mt-0.5 shrink-0 font-mono text-[10px] text-subtle"
                      >
                        WEBSITE ↗
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            ) : course.resources.length > 0 ? (
              <section className="flex flex-col items-start gap-2">
                <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand-ink uppercase">
                  Go deeper
                </h2>
                <p className="text-sm text-subtle">
                  Find direct English websites matched to this course. This uses
                  one basic search credit and never sends you to a search
                  results page.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={findingLinks}
                  onClick={() => findLearningLinks()}
                  className="rounded-full"
                >
                  {findingLinks ? "Finding links…" : "Find direct websites"}
                </Button>
              </section>
            ) : null}

            {course.uncovered.length > 0 && (
              <section className="rounded-lg border border-border bg-surface p-3">
                <h2 className="font-mono text-[10px] tracking-[0.14em] text-subtle uppercase">
                  Not covered by your sources
                </h2>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-subtle">
                  {course.uncovered.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {citationEntries.length > 0 && (
              <CitationList citations={citationEntries} />
            )}

            {sources.length > 0 && citationEntries.length === 0 && (
              <section className="rounded-card border border-border bg-surface p-4">
                <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand-ink uppercase">
                  Citations
                </h2>
                <p className="mt-2 text-sm text-subtle">
                  This course predates claim-level citations. Rebuild it to
                  attach verified excerpts from your uploaded sources.
                </p>
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function citationKey(citation: CourseCitation) {
  return `${citation.source}\u0000${citation.quote}`;
}

function collectCitations(course: GeneratedCourse) {
  const seen = new Set<string>();
  const citations: CourseCitation[] = [];

  for (const citation of [
    ...course.citations,
    ...course.sections.flatMap((section) => section.citations),
  ]) {
    const key = citationKey(citation);
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push(citation);
  }

  return citations;
}

function CitationMarks({
  citations,
  numbers,
  label,
}: {
  citations: CourseCitation[];
  numbers: Map<string, number>;
  label: string;
}) {
  if (citations.length === 0) return null;

  return (
    <nav
      aria-label={label}
      className="mt-2 flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-1 font-mono text-[10px] tracking-[0.14em] text-subtle uppercase">
        Cited
      </span>
      {citations.map((citation) => {
        const number = numbers.get(citationKey(citation));
        if (!number) return null;

        return (
          <a
            key={citationKey(citation)}
            href={`#course-source-${number}`}
            title={`${citation.source}: ${citation.quote}`}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-brand/25 bg-brand/[0.07] px-1.5 font-mono text-[10px] font-semibold text-brand-ink transition-colors hover:border-brand/50 hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            [{number}]
          </a>
        );
      })}
    </nav>
  );
}

function CitationList({ citations }: { citations: CourseCitation[] }) {
  return (
    <section
      aria-labelledby="course-citations-heading"
      className="flex flex-col gap-3 border-t border-border pt-6"
    >
      <div>
        <h2
          id="course-citations-heading"
          className="font-mono text-[11px] tracking-[0.18em] text-brand-ink uppercase"
        >
          Sources & citations
        </h2>
        <p className="mt-1.5 text-sm text-subtle">
          Each excerpt was verified against its uploaded or researched source
          before being shown.
        </p>
      </div>
      <ol className="flex flex-col gap-2">
        {citations.map((citation, index) => (
          <li
            id={`course-source-${index + 1}`}
            key={citationKey(citation)}
            className="scroll-mt-24 rounded-card border border-border bg-surface p-4 target:border-brand/50 target:bg-brand/[0.04]"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] font-semibold text-brand-ink">
                [{index + 1}]
              </span>
              {citation.url ? (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="break-all text-sm font-semibold text-strong transition-colors hover:text-brand-ink"
                >
                  {citation.source} ↗
                </a>
              ) : (
                <span className="break-all text-sm font-semibold text-strong">
                  {citation.source}
                </span>
              )}
            </div>
            <blockquote className="mt-2 border-l-2 border-brand/30 pl-3 text-sm leading-relaxed text-foreground">
              “{citation.quote}”
            </blockquote>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Field({ label, body }: { label: string; body: string }) {
  return (
    <p className="text-sm text-foreground">
      <span className="font-mono text-[10px] tracking-[0.14em] text-subtle uppercase">
        {label}
      </span>
      <br />
      {body}
    </p>
  );
}
