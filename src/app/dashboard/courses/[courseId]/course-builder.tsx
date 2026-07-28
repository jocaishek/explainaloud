"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CirclePlay, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type SourceItem, SourceUploader } from "~/components/source-uploader";
import { Button } from "~/components/ui/button";
import type { GeneratedCourse } from "~/lib/ai/schemas";

const EASE = [0.23, 1, 0.32, 1] as const;

/** Turns a model-supplied search phrase into a link that always resolves. */
function youtubeSearch(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
function webSearch(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function CourseBuilder({
  courseId,
  topic,
  initialSources,
  initialCourse,
  generatedBy,
}: {
  courseId: string;
  topic: string;
  initialSources: SourceItem[];
  initialCourse: GeneratedCourse | null;
  generatedBy: string | null;
}) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [course, setCourse] = useState(initialCourse);
  const [provider, setProvider] = useState(generatedBy);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setProvider(json.provider);
        router.refresh();
      }
    } catch {
      setError("Couldn't reach the server.");
    }
    setGenerating(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand uppercase">
            Your sources
          </h2>
          <p className="mt-1.5 text-sm text-subtle">
            The course is built only from these. Nothing else gets used.
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
          disabled={generating || sources.length === 0}
          className="h-11 gap-2 rounded-full bg-brand px-6 font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand)] transition-transform duration-200 ease-out hover:bg-brand/90 active:scale-[0.97] disabled:opacity-50"
        >
          <Sparkles className="size-4" />
          {generating
            ? "Reading your sources…"
            : course
              ? "Rebuild the course"
              : "Build my course"}
        </Button>

        {sources.length === 0 && (
          <p className="text-sm text-subtle">Add a source to get started.</p>
        )}

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

        {provider && (
          <span className="font-mono text-[10px] tracking-[0.14em] text-subtle uppercase">
            via {provider}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

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
              <section key={section.title} className="flex flex-col gap-3">
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

            {course.video_searches.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand uppercase">
                  Watch
                </h2>
                <div className="flex flex-col gap-2">
                  {course.video_searches.map((query) => (
                    <a
                      key={query}
                      href={youtubeSearch(query)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors hover:border-brand/40 hover:text-strong"
                    >
                      <CirclePlay className="size-4 shrink-0 text-red-500" />
                      <span className="min-w-0 flex-1">{query}</span>
                      <ExternalLink className="size-3.5 shrink-0 text-subtle" />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {course.resources.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="font-mono text-[11px] tracking-[0.18em] text-brand uppercase">
                  Go deeper
                </h2>
                <div className="flex flex-col gap-2">
                  {course.resources.map((resource) => (
                    <a
                      key={resource.label}
                      href={webSearch(`${topic} ${resource.label}`)}
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
                      <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-subtle" />
                    </a>
                  ))}
                </div>
              </section>
            )}

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
