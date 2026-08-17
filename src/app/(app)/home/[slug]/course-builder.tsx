"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { cn } from "~/lib/utils";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * The course first, the material it was built from last.
 *
 * This page used to open with the notes somebody pasted in, then the files they
 * uploaded, then the build button, and only then the course — so the thing they
 * came back for was four blocks down, under a verbatim copy of something they
 * had already read once when they typed it. Inputs are interesting exactly
 * twice: while you are providing them, and when you are checking what the
 * course was made of. Neither of those is "every time you open the topic".
 *
 * So the order is inverted. The course is the page; the material sits under it
 * in one panel that can be opened, corrected and rebuilt from. A topic with no
 * course yet is the same layout with the top half empty, which is also when the
 * material panel is the only thing on screen and wants to be.
 */

/**
 * How tall pasted notes are allowed to be before they are cut off, in pixels.
 *
 * A height rather than a character count, because it is the *screen* being
 * protected: one 900-character paragraph and thirty short lines are the same
 * number of characters and nothing like the same amount of page. Roughly eight
 * lines, which is enough to recognise what you pasted and not enough to bury
 * the panel under it.
 */
const NOTES_COLLAPSED_PX = 176;

/* Children rise in document order rather than all at once. The stagger is the
   same idea as the landing page's reveal, at a tempo that suits a block of
   panels arriving together rather than a page being scrolled. */
const LIST = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.055 } },
};
const ITEM = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/**
 * The landing page's panel, in the app's register.
 *
 * A hairline, a 20px radius and a hard offset shadow — no blur — is what every
 * panel on the marketing page is, and it is most of what that page looks like.
 * These boxes were `rounded-control` over `bg-surface`, which in this register
 * resolves to a square-cornered tint with no elevation at all: correct tokens,
 * flat result, nothing like the product people were shown before signing up.
 */
const PANEL =
  "rounded-card border border-border bg-card shadow-rest panel-live";

export function CourseBuilder({
  courseId,
  slug,
  inputNotes,
  initialSources,
  initialCourse,
  initialSourcesOnly = false,
  unlimited = false,
}: {
  courseId: string;
  /** The course's URL segment. Links use it; API calls use the id. */
  slug: string;
  /** What was pasted in when the topic was started. Shown at the foot. */
  inputNotes: string | null;
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
    /* `reducedMotion="user"` covers every `motion` element below it, so the
       staggered arrival and the notes expanding are off for anybody who has
       asked their system for that — without each one testing for it. */
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-8">
        {course && (
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="h-11 gap-2 px-6 font-semibold">
              <Link href={`/home/${slug}/record`}>Start explaining</Link>
            </Button>
            {/* Down to the material rather than up: the thing this scrolls to
                is the bottom of the page, and saying so is cheaper than a
                second trip to find out. */}
            <Button asChild variant="outline" className="h-11">
              <a href="#course-material">Built from ↓</a>
            </Button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <AgentOrchestration run={course?.orchestration} running={generating} />

        <AnimatePresence>
          {course && (
            <motion.div
              variants={LIST}
              initial="hidden"
              animate="shown"
              className="flex flex-col gap-6"
            >
              {/* Broad topics still get a course. They just grade badly,
                  because the key points spread across a whole field and a good
                  explanation of one corner scores like a poor explanation of
                  all of it. Saying so here turns a confusing score into an
                  understood one, before the recording rather than after it. */}
              {course.scope_note && (
                <motion.aside
                  variants={ITEM}
                  className={cn(
                    PANEL,
                    "border-amber-500/30 bg-amber-500/[0.06] p-5",
                  )}
                >
                  <p className="font-semibold text-sm text-strong">
                    This topic is quite broad
                  </p>
                  <p className="mt-2 text-sm text-subtle leading-6">
                    {course.scope_note.reason} You can still record an
                    explanation and the course below is yours to use, but expect
                    a lower score than a narrower topic would give you.
                  </p>
                  {course.scope_note.suggestions.length > 0 && (
                    <p className="mt-3 text-sm text-subtle leading-6">
                      Sharper next time:{" "}
                      {course.scope_note.suggestions.map(
                        (suggestion, index) => (
                          <span key={suggestion}>
                            {index > 0 && ", "}
                            <span className="font-medium text-strong">
                              {suggestion}
                            </span>
                          </span>
                        ),
                      )}
                      .
                    </p>
                  )}
                </motion.aside>
              )}

              {/* The overview, set larger than body copy. It is the one thing
                  on this page somebody reads in full before deciding whether
                  to record, so it is allowed to be the loudest paragraph. */}
              <motion.div variants={ITEM} className={cn(PANEL, "p-5 sm:p-6")}>
                <p className="text-[0.98rem] text-foreground leading-relaxed">
                  {course.summary}
                </p>
                <CitationMarks
                  citations={course.citations}
                  numbers={citationNumbers}
                  label="Sources for the course overview"
                />
              </motion.div>

              {course.notes.length > 0 && (
                <motion.section
                  variants={ITEM}
                  className={cn(PANEL, "overflow-hidden")}
                >
                  <h2 className="border-border border-b px-5 py-4 font-mono text-[11px] text-brand-ink uppercase tracking-[0.18em]">
                    Notes
                  </h2>
                  {/* Divided rows inside one panel rather than a stack of
                      little boxes: eight bordered tiles in a column is eight
                      objects to look at, and this is one list. */}
                  <ul className="divide-y divide-border">
                    {course.notes.map((note) => (
                      <li
                        key={note}
                        className="flex gap-3 px-5 py-3 text-foreground text-sm transition-colors duration-200 hover:bg-muted"
                      >
                        <span aria-hidden className="text-brand-ink">
                          —
                        </span>
                        {note}
                      </li>
                    ))}
                  </ul>
                  <div className="px-5 pb-4">
                    <CitationMarks
                      citations={course.citations}
                      numbers={citationNumbers}
                      label="Sources for the revision notes"
                    />
                  </div>
                </motion.section>
              )}

              {course.sections.map((section, i) => (
                <motion.section
                  id={courseSectionId(i)}
                  key={section.title}
                  tabIndex={-1}
                  variants={ITEM}
                  className={cn(
                    PANEL,
                    "flex scroll-mt-24 flex-col gap-3 p-5 sm:p-6",
                    "target:border-[color:var(--accent-solid)]",
                  )}
                >
                  <h3 className="flex items-baseline gap-3 font-semibold text-lg text-strong">
                    <span className="font-mono text-[11px] text-brand-ink tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </h3>
                  <Field label="Intuition" body={section.intuition} />
                  <Field label="Analogy" body={section.analogy} />
                  <Field label="Technical" body={section.technical} />
                  <Field label="Example" body={section.example} />
                  <p className="rounded-control border border-brand/20 bg-brand/[0.06] px-3 py-2 font-medium text-sm text-strong">
                    {section.quiz}
                  </p>
                  <CitationMarks
                    citations={section.citations}
                    numbers={citationNumbers}
                    label={`Sources for ${section.title}`}
                  />
                </motion.section>
              ))}

              {englishVideos.length > 0 ? (
                <motion.section
                  variants={ITEM}
                  className={cn(PANEL, "overflow-hidden")}
                >
                  <h2 className="border-border border-b px-5 py-4 font-mono text-[11px] text-brand-ink uppercase tracking-[0.18em]">
                    Watch
                  </h2>
                  <div className="divide-y divide-border">
                    {englishVideos.map((video) => (
                      <a
                        key={video.url}
                        href={video.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group/link flex items-center gap-3 px-5 py-3 text-foreground text-sm transition-colors duration-200 hover:bg-muted hover:text-strong"
                      >
                        <span className="min-w-0 flex-1">{video.title}</span>
                        <span
                          aria-hidden
                          className="shrink-0 font-mono text-[10px] text-subtle transition-transform duration-200 group-hover/link:translate-x-0.5"
                        >
                          YOUTUBE ↗
                        </span>
                      </a>
                    ))}
                  </div>
                  <div className="px-5 py-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={findingLinks}
                      onClick={() => findLearningLinks(true)}
                      className="w-fit text-subtle"
                    >
                      {findingLinks
                        ? "Checking links…"
                        : "Refresh videos & websites"}
                    </Button>
                  </div>
                </motion.section>
              ) : course.video_searches.length > 0 ? (
                <motion.section
                  variants={ITEM}
                  className={cn(PANEL, "flex flex-col items-start gap-2 p-5")}
                >
                  <h2 className="font-mono text-[11px] text-brand-ink uppercase tracking-[0.18em]">
                    Watch
                  </h2>
                  <p className="text-sm text-subtle">
                    Find direct videos matched to this course. This uses one
                    basic search credit and saves the results.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={findingLinks}
                    onClick={() => findLearningLinks()}
                  >
                    {findingLinks ? "Finding links…" : "Find videos & websites"}
                  </Button>
                </motion.section>
              ) : null}

              {directResources.length > 0 ? (
                <motion.section
                  variants={ITEM}
                  className={cn(PANEL, "overflow-hidden")}
                >
                  <h2 className="border-border border-b px-5 py-4 font-mono text-[11px] text-brand-ink uppercase tracking-[0.18em]">
                    Go deeper
                  </h2>
                  <div className="divide-y divide-border">
                    {directResources.map((resource) => (
                      <a
                        key={resource.url}
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group/link flex items-start gap-3 px-5 py-3 transition-colors duration-200 hover:bg-muted"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-sm text-strong">
                            {resource.label}
                          </span>
                          {resource.why && (
                            <span className="mt-0.5 block text-subtle text-xs">
                              {resource.why}
                            </span>
                          )}
                        </span>
                        <span
                          aria-hidden
                          className="mt-0.5 shrink-0 font-mono text-[10px] text-subtle transition-transform duration-200 group-hover/link:translate-x-0.5"
                        >
                          WEBSITE ↗
                        </span>
                      </a>
                    ))}
                  </div>
                </motion.section>
              ) : course.resources.length > 0 ? (
                <motion.section
                  variants={ITEM}
                  className={cn(PANEL, "flex flex-col items-start gap-2 p-5")}
                >
                  <h2 className="font-mono text-[11px] text-brand-ink uppercase tracking-[0.18em]">
                    Go deeper
                  </h2>
                  <p className="text-sm text-subtle">
                    Find direct English websites matched to this course. This
                    uses one basic search credit and never sends you to a search
                    results page.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={findingLinks}
                    onClick={() => findLearningLinks()}
                  >
                    {findingLinks ? "Finding links…" : "Find direct websites"}
                  </Button>
                </motion.section>
              ) : null}

              {course.uncovered.length > 0 && (
                <motion.section variants={ITEM} className={cn(PANEL, "p-5")}>
                  <h2 className="font-mono text-[10px] text-subtle uppercase tracking-[0.14em]">
                    Not covered by your sources
                  </h2>
                  <ul className="mt-2 flex flex-col gap-1 text-subtle text-sm">
                    {course.uncovered.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </motion.section>
              )}

              {citationEntries.length > 0 && (
                <motion.div variants={ITEM}>
                  <CitationList citations={citationEntries} />
                </motion.div>
              )}

              {sources.length > 0 && citationEntries.length === 0 && (
                <motion.section variants={ITEM} className={cn(PANEL, "p-5")}>
                  <h2 className="font-mono text-[11px] text-brand-ink uppercase tracking-[0.18em]">
                    Citations
                  </h2>
                  <p className="mt-2 text-sm text-subtle">
                    This course predates claim-level citations. Rebuild it to
                    attach verified excerpts from your uploaded sources.
                  </p>
                </motion.section>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Everything this was built from, at the foot of the page. */}
        <section
          id="course-material"
          aria-labelledby="course-material-heading"
          className={cn(PANEL, "scroll-mt-24 overflow-hidden")}
        >
          <div className="border-border border-b px-5 py-4">
            <h2
              id="course-material-heading"
              className="font-mono text-[11px] text-brand-ink uppercase tracking-[0.18em]"
            >
              {course ? "Built from" : "Your material"}
            </h2>
            <p className="mt-1.5 text-sm text-subtle">
              {sources.length > 0
                ? "The course is grounded in these sources."
                : course?.citations.length
                  ? "Explainaloud researched direct sources and cites them throughout this course."
                  : "Sources are optional. Without them, the course uses established textbook knowledge."}
            </p>
          </div>

          <div className="flex flex-col gap-5 p-5">
            {inputNotes?.trim() && <InputNotes notes={inputNotes} />}

            <div className="flex flex-col gap-3">
              <h3 className="font-mono text-[10px] text-subtle uppercase tracking-[0.14em]">
                Files
              </h3>
              <SourceUploader
                courseId={courseId}
                initialSources={sources}
                onChange={setSources}
                unlimited={unlimited}
              />
            </div>

            {/* Shown only with files present: with nothing uploaded there is
                nothing to be strict about, and the course has to come from
                somewhere. */}
            {sources.length > 0 && (
              <fieldset
                disabled={generating}
                className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 disabled:opacity-60"
              >
                <legend className="px-1 font-semibold text-sm text-strong">
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
                  <p className="text-subtle text-xs leading-5">
                    Rebuild the course for this to take effect.
                  </p>
                )}
              </fieldset>
            )}

            <Button
              type="button"
              onClick={generate}
              disabled={generating}
              className="h-11 w-full gap-2 px-6 font-semibold sm:w-fit"
            >
              {generating
                ? "Reading your sources…"
                : course
                  ? "Rebuild the course"
                  : "Build my course"}
            </Button>
          </div>
        </section>
      </div>
    </MotionConfig>
  );
}

/**
 * Pasted notes, cut off at a readable height with the rest one click away.
 *
 * These are shown in full or not at all everywhere else in the product, and
 * "in full" for somebody who pasted three pages of lecture notes meant the
 * panel below this one started three screens down. Cutting it off needs a way
 * back, and the way back has to say there is more — hence both the chevron and
 * the fade, which is the part that actually reads as "continues".
 *
 * The height is measured rather than assumed: the control only appears when
 * the text really is taller than the window, so a two-line note does not get a
 * Show all button that expands nothing. Re-measured on resize, because the same
 * text is a different number of lines at a different width.
 */
function InputNotes({ notes }: { notes: string }) {
  const [open, setOpen] = useState(false);
  /* Assumed to overflow until measured, so the first paint is the cut-down
     one. Starting at `false` meant three pages of notes rendered in full and
     then visibly collapsed a frame later — the exact thing this is here to
     prevent, played as an animation. */
  const [overflows, setOverflows] = useState(true);
  /* Nothing animates until somebody asks for it. The correction from the
     measurement is a height change too, and animating that is the same flash
     in the other direction. */
  const [interactive, setInteractive] = useState(false);
  const body = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const measure = () =>
      setOverflows(el.scrollHeight > NOTES_COLLAPSED_PX + 8);
    measure();
    // Re-measured on resize: the same text is a different number of lines at a
    // different width, so what overflows on a phone may not on a desktop.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-mono text-[10px] text-subtle uppercase tracking-[0.14em]">
        Notes you pasted
      </h3>

      <motion.div
        // `initial={false}`: the height is a state to be in, not one to travel
        // to. Combined with the zero duration below, the collapsed height is
        // simply where this starts.
        initial={false}
        animate={{
          height: open || !overflows ? "auto" : NOTES_COLLAPSED_PX,
        }}
        transition={{ duration: interactive ? 0.35 : 0, ease: EASE }}
        className="relative overflow-hidden"
      >
        <p
          ref={body}
          className="whitespace-pre-wrap text-foreground text-sm leading-relaxed"
        >
          {notes}
        </p>
        {/* The fade is what says "there is more", and it has to be painted in
            the panel's own colour or it reads as a grey band. */}
        <AnimatePresence>
          {overflows && !open && (
            <motion.span
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent"
            />
          )}
        </AnimatePresence>
      </motion.div>

      {overflows && (
        <button
          type="button"
          onClick={() => {
            setInteractive(true);
            setOpen((was) => !was);
          }}
          aria-expanded={open}
          className="press flex w-fit items-center gap-1.5 rounded-control py-1 font-mono text-[10px] text-subtle uppercase tracking-[0.14em] transition-colors hover:text-strong"
        >
          {open ? "Show less" : "Show all"}
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3.5 transition-transform duration-300 ease-out",
              open && "rotate-180",
            )}
          />
        </button>
      )}
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
            className="inline-flex h-6 min-w-6 items-center justify-center rounded-control border border-brand/25 bg-brand/[0.07] px-1.5 font-mono text-[10px] font-semibold text-brand-ink transition-colors hover:border-brand/50 hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
      <ol className="flex flex-col gap-3">
        {citations.map((citation, index) => (
          <li
            id={`course-source-${index + 1}`}
            key={citationKey(citation)}
            className={cn(
              PANEL,
              "scroll-mt-24 p-4 target:border-brand/50 target:bg-brand/[0.04]",
            )}
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
