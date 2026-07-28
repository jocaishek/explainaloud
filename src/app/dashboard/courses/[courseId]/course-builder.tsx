"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentOrchestration } from "~/components/agent-orchestration";
import { type SourceItem, SourceUploader } from "~/components/source-uploader";
import { Button } from "~/components/ui/button";
import type { GeneratedCourse } from "~/lib/ai/schemas";
import { courseSectionId } from "~/lib/course-sections";
import {
  directLearningWebsite,
  looksLikeEnglishText,
} from "~/lib/link-quality";

const EASE = [0.23, 1, 0.32, 1] as const;

export function CourseBuilder({
  courseId,
  initialSources,
  initialCourse,
}: {
  courseId: string;
  initialSources: SourceItem[];
  initialCourse: GeneratedCourse | null;
}) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
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
    try {
      const response = await fetch(`/api/courses/${courseId}/generate`, {
        method: "POST",
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Course generation failed.");
      } else {
        setCourse(json.course);
        router.refresh();
      }
    } catch {
      setError("Couldn't reach the server.");
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

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand uppercase">
            Your sources
          </h2>
          <p className="mt-1.5 text-sm text-subtle">
            {sources.length > 0
              ? "The course is grounded in these sources."
              : "Sources are optional. Without them, the course uses established textbook knowledge."}
          </p>
        </div>
        <SourceUploader
          courseId={courseId}
          initialSources={sources}
          onChange={setSources}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={generate}
          disabled={generating}
          className="h-11 gap-2 rounded-full bg-brand px-6 font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand)] transition-transform duration-200 ease-out hover:bg-brand/90 active:scale-[0.97] disabled:opacity-50"
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
            <Link href={`/dashboard/courses/${courseId}/record`}>
              Start explaining
            </Link>
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
            <p className="text-foreground">{course.summary}</p>

            {course.notes.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand uppercase">
                  Notes
                </h2>
                <ul className="flex flex-col gap-2">
                  {course.notes.map((note) => (
                    <li
                      key={note}
                      className="flex gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                    >
                      <span aria-hidden className="text-brand">
                        —
                      </span>
                      {note}
                    </li>
                  ))}
                </ul>
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
                  <span className="font-mono text-[11px] text-brand">
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
              </section>
            ))}

            {englishVideos.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand uppercase">
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
                <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand uppercase">
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
                <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand uppercase">
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
                <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand uppercase">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
