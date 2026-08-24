"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { ExplainaloudMark } from "~/components/explainaloud-mark";
import { LandingRedesign } from "~/components/landing/landing-redesign";
import { TryIt } from "~/components/landing/try-it";
import { useInView } from "~/hooks/use-in-view";
import { useMediaQuery } from "~/hooks/use-media-query";
import { cn } from "~/lib/utils";

/* -------------------------------------------------------------------------
 * The transmission script
 * -------------------------------------------------------------------------
 * Read the direction contract at the top of `layout.tsx` before changing this
 * file. The page is laid out as an as-live broadcast script — timecode gutter,
 * hairlines instead of card edges, nothing that only restates a claim in
 * different words — and every decision below follows from that.
 *
 * The rule that governs the whole file: this product marks you while you are
 * still talking, so the page marks you while you are still reading it. There
 * is no screenshot of that happening anywhere on it.
 * ---------------------------------------------------------------------- */

/** The house ease. Exponential out: immediate to start, long to settle. */
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

type Verdict = "ok" | "miss" | "vague" | "plain";

/** A run of words sharing one verdict. `plain` runs are never marked. */
type Run = readonly [text: string, verdict: Verdict];

const VERDICT_LABEL: Record<Exclude<Verdict, "plain">, string> = {
  ok: "correct",
  vague: "too vague to check",
  miss: "missing a step",
};

/* -------------------------------------------------------------------------
 * Content
 * ---------------------------------------------------------------------- */

/**
 * The headline, which marks itself.
 *
 * Written as marked runs rather than as a sentence with decoration applied to
 * it, and the marks are the point: the headline is graded the way a take is,
 * before the visitor has read anything else.
 *
 * The sentence is what you get, not what is wrong with you, and the two marks
 * are the two ends of it: "sort of" in amber, the state you arrive in, and
 * "certain" in green, the state you leave in. The colours carry the change,
 * which is the only job worth giving them here.
 *
 * Three earlier lines missed it in three different ways. "Rereading feels like
 * learning. Saying it out loud is where you find out" was two sentences where
 * one would do, with amber on "feels like" — not a claim anybody would grade,
 * so the colour was decoration in the costume of a verdict. "You sort of know
 * it until you say it out loud" fixed the marking but described the product
 * rather than the reader. "Thinking you know it feels exactly like knowing it"
 * described the reader and told them something unflattering about themselves
 * in the first line they read, which is a strange way to open.
 */
/**
 * Says what you do, then what you get.
 *
 * This was "Find the gaps you didn't know you had." — a good line about the
 * payoff that never mentions the mechanism, and so is equally true of a
 * flashcard app, a quiz generator or an analytics dashboard. The one sentence
 * on the page that plainly explained the product was the subhead below it, at
 * 70% opacity, which is not where somebody deciding whether to read on is
 * looking. Naming the action in the headline is the whole fix: a visitor who
 * reads six words now knows they will be talking out loud.
 */
const HEADLINE: readonly Run[] = [
  ["Explain your notes out loud. See what you missed.", "plain"],
];

/**
 * A real explanation, marked the way the product marks one.
 *
 * Authored demonstration material, not a recording of anybody. Physics here,
 * chemistry in section 03 and American history in section 05 — one subject
 * repeated down the page reads as "this is a biology tool", and the product is
 * not one. Every verdict is one the grader would actually reach: the missed
 * step is genuinely missed, and the vague run is vague rather than wrong.
 *
 * Deliberately short lines. Long enough to be a real explanation, short enough
 * that nobody skims them as prose addressed to *them* — a paragraph of
 * second-person sentences on a landing page reads as instructions, and these
 * are somebody else's answer being marked.
 */
const TAKE: readonly {
  readonly at: string;
  readonly runs: readonly Run[];
}[] = [
  {
    at: "00:00:04",
    runs: [
      ["Newton's third law: forces come in pairs, ", "plain"],
      ["equal and opposite", "ok"],
      [".", "plain"],
    ],
  },
  {
    at: "00:00:11",
    runs: [
      ["So push a wall and the wall ", "plain"],
      ["kind of pushes back", "vague"],
      [".", "plain"],
    ],
  },
  {
    at: "00:00:17",
    runs: [
      ["That is why ", "plain"],
      ["you feel it in your hand", "ok"],
      [".", "plain"],
    ],
  },
];

/**
 * The level meter's bars: a height and a stagger apiece.
 *
 * Written out rather than generated, so each bar has a stable identity and the
 * heights are a shape somebody chose rather than a sine wave. Twelve is enough
 * to read as a level and few enough to stay legible at panel width.
 */
const LEVELS = [
  0.5, 0.9, 0.35, 1, 0.6, 0.85, 0.3, 0.7, 0.95, 0.45, 0.8, 0.55,
].map((height, i) => ({ height, delay: i * 90 }));

/** What was never said. Shown after the take, in its own register. */
const NOT_SAID = "the two forces act on different objects";

/* Lettered, not numbered.
 *
 * The section itself is 02 in the gutter and these steps were 01 to 04 in the
 * same column, so reading straight down gave you 02, 01, 02, 03, 04 — two
 * different counters in one line of sight, one of which appeared to restart.
 * Letters cannot be mistaken for the section index, and the sequence still
 * reads in order. */
const RUNNING_ORDER = [
  {
    n: "A",
    item: "Upload the material",
    dur: "0:30",
    detail:
      "Slides, a chapter, your notes. PDF, Word, Markdown, HTML, CSV or LaTeX, up to 5 MB.",
  },
  {
    n: "B",
    item: "A course gets built from it",
    dur: "2:00",
    detail:
      "Agents draft it and audit each other. Every claim is tied to a quote from your files.",
  },
  {
    n: "C",
    item: "You talk for three minutes",
    dur: "3:00",
    detail:
      "Explain it the way you would to someone who has never met it. Marked as you speak.",
  },
  {
    n: "D",
    item: "You read back what you missed",
    dur: "1:00",
    detail:
      "Claim by claim. Every topic lands as review, practice or mastered.",
  },
] as const;

/**
 * Named for what each section shows, not for what it is called internally.
 *
 * "Running order" is a broadcast term, "Sources only" is this codebase's
 * shorthand for source-grounding, and "Live marking" reads as a school word to
 * anybody who was not marked at school. All three were labels you had to
 * already understand the product to decode, sitting in the one component whose
 * job is to tell a stranger what is on the page.
 *
 * Short, because this is a row and not a sentence. "Marked as you talk" and
 * "From your files" read better but ran the bar 8px past the viewport at
 * 1280 — the whole page scrolled sideways. The section heads underneath are
 * where the full phrasing belongs; a nav label only has to be recognisable
 * once you get there.
 *
 * The ids stay as they are: they are anchors in URLs people may already have.
 */
const SECTIONS = [
  { id: "order", label: "How it works" },
  { id: "marking", label: "As you talk" },
  { id: "pace", label: "Pace" },
  { id: "sources", label: "Your files" },
  { id: "try", label: "Try it" },
] as const;

/* -------------------------------------------------------------------------
 * Marking
 * ---------------------------------------------------------------------- */

/**
 * One run of words, with its verdict wiped underneath it.
 *
 * The rule is a background on the text span rather than an element behind it,
 * so `box-decoration-break: clone` can give each line fragment its own mark. A
 * marked phrase in a headline is regularly two fragments, and anything
 * absolutely positioned inside it gets their union: one block overhanging the
 * end of the first line and running under the start of the second.
 *
 * Colour arrives with the rule rather than before it, which is why the text
 * colour transitions on the same beat.
 */
function Marked({
  run,
  cued,
  delay = 0,
  rule = true,
}: {
  run: Run;
  cued: boolean;
  delay?: number;
  /**
   * Whether to draw the rule under the words.
   *
   * Off in the headline. At display size with leading below 1, the rule under
   * one line lands in the cap height of the next and the whole block turns
   * into a grid of strikethroughs. Colour and slope carry the mark there;
   * running text, where the lines are far enough apart, keeps the rule.
   */
  rule?: boolean;
}) {
  const [text, verdict] = run;

  if (verdict === "plain") return <>{text}</>;

  return (
    <>
      <span
        className={cn(
          // Italic as well as coloured. Colour alone carries the verdict for
          // anyone who can see all three; the slope carries it for everyone
          // else, and it is what stops a marked phrase reading as a link.
          "italic transition-colors duration-500",
          rule && (cued ? "cue-mark" : "cue-idle"),
        )}
        style={
          {
            backgroundImage: rule
              ? `linear-gradient(var(--${verdict}), var(--${verdict}))`
              : undefined,
            animationDelay: `${delay}ms`,
            color: cued ? `var(--${verdict})` : undefined,
            transitionDelay: `${delay}ms`,
          } as CSSProperties
        }
      >
        {text}
      </span>
      <span className="sr-only"> ({VERDICT_LABEL[verdict]})</span>
    </>
  );
}

/* -------------------------------------------------------------------------
 * The take arriving
 * ------------------------------------------------------------------------- */

/**
 * A run split into its own leading space, its words, and its trailing space.
 *
 * The spacing has to survive being cut in half. Every run in `TAKE` carries
 * explicit leading and trailing spaces so the sentences join correctly, and a
 * naive `split(" ")` on a partially revealed run either eats them or doubles
 * them at the seam. The trailing space is withheld until the last word lands,
 * which is what keeps the caret against the final letter rather than a space
 * away from it.
 */
function sliceRun(text: string, shown: number) {
  const lead = text.match(/^\s*/)?.[0] ?? "";
  const trail = text.match(/\s*$/)?.[0] ?? "";
  const words = text.trim().split(/\s+/);
  const taken = words.slice(0, shown);
  if (taken.length === 0) return "";
  return lead + taken.join(" ") + (shown >= words.length ? trail : "");
}

function wordCount(text: string) {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

/**
 * The take arriving a word at a time, and being marked as it lands.
 *
 * This is the animation Grammarly and TurboLearn use — text appearing and then
 * being annotated in front of you — done accurately for what this product
 * actually is. The words are not being typed: they are being transcribed off
 * somebody speaking, which is why they arrive whole rather than letter by
 * letter, at roughly the rate of speech, with a caret at the leading edge.
 *
 * A verdict lands only once its phrase has finished arriving. That ordering is
 * the honest one and it is also the point of the product: nothing can be
 * marked correct or missing until it has actually been said.
 *
 * `pace` is words per minute — the same 128 the panel reports, so the demo
 * runs at the speed the label claims.
 */
function useTakeArriving(runs: readonly Run[], pace = 128) {
  const total = runs.reduce((n, run) => n + wordCount(run[0]), 0);
  const [spoken, setSpoken] = useState(0);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    if (reduced) {
      setSpoken(total);
      return;
    }
    /* The take runs, holds on the finished result, and runs again.
     *
     * It used to stop at the last word, which meant that unless somebody
     * arrived in the six seconds it was speaking, the hero was a still picture
     * of a transcript — the one thing it exists not to be. The hold is the
     * longest pause in the loop and it is doing work: the finished state, with
     * the missed step named underneath, is what the panel is arguing for, and
     * a take that snapped straight back to nothing would never let anybody
     * read it. */
    const done = spoken >= total;
    const id = window.setTimeout(
      () => setSpoken(done ? 0 : spoken + 1),
      done ? 3_400 : spoken === 0 ? 500 : 60_000 / pace,
    );
    return () => window.clearTimeout(id);
  }, [spoken, total, pace, reduced]);

  return { spoken, total, done: spoken >= total };
}

/**
 * One line of a take, revealed against a running word count.
 *
 * `offset` is how many words of the whole take come before this line, so every
 * line reads from the same clock and the caret only ever exists in one place.
 */
function ArrivingLine({
  runs,
  offset,
  spoken,
  className,
}: {
  runs: readonly Run[];
  offset: number;
  spoken: number;
  className?: string;
}) {
  let seen = offset;
  const lineWords = runs.reduce((n, run) => n + wordCount(run[0]), 0);
  const caretHere = spoken > offset && spoken < offset + lineWords;

  return (
    <p className={className}>
      {runs.map((run) => {
        const [text, verdict] = run;
        const words = wordCount(text);
        const shown = Math.max(0, Math.min(words, spoken - seen));
        seen += words;
        const slice = sliceRun(text, shown);
        if (slice === "") return null;
        return (
          <Marked
            key={`${verdict}:${text}`}
            run={[slice, verdict]}
            cued={shown >= words}
          />
        );
      })}
      {caretHere ? (
        <span
          aria-hidden="true"
          className="animate-caret ml-[0.06em] inline-block h-[0.9em] w-[0.09em] translate-y-[0.06em] bg-current align-baseline"
        />
      ) : null}
    </p>
  );
}

/** A whole line of runs, cued one after another. */
function MarkedLine({
  runs,
  cued,
  baseDelay = 0,
  step = 300,
  rule = true,
}: {
  runs: readonly Run[];
  cued: boolean;
  baseDelay?: number;
  step?: number;
  rule?: boolean;
}) {
  let marks = 0;
  return (
    <>
      {runs.map((run) => {
        const delay = run[1] === "plain" ? 0 : baseDelay + marks++ * step;
        return (
          <Marked
            key={`${run[1]}:${run[0]}`}
            run={run}
            cued={cued}
            delay={delay}
            rule={rule}
          />
        );
      })}
    </>
  );
}

/* -------------------------------------------------------------------------
 * Chrome
 * ---------------------------------------------------------------------- */

/** Small tracked mono. The page's only label voice. */
function Slug({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        // 0.6rem at 0.14em of tracking was a specimen label, not a thing
        // anybody reads. Two points larger, a third less tracking and a touch
        // more contrast keeps the instrument voice and makes it legible.
        "font-mono text-[0.68rem] uppercase leading-[1.5] tracking-[0.09em] opacity-70",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The ultramarine action. Square: nothing on this page is a pill. */
function Cue({
  href,
  children,
  tone = "solid",
  className,
}: {
  href: string;
  children: React.ReactNode;
  tone?: "solid" | "outline";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        // Sans, sentence case, and a size you can read at a glance. Tracked
        // mono caps is a good voice for a timecode and a poor one for the
        // thing somebody is looking for when they have decided to act.
        "press inline-flex items-center rounded-full px-6 py-3.5 font-medium text-[0.95rem] transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-[var(--ink)] focus-visible:outline-offset-2",
        tone === "solid"
          ? "bg-[var(--ink)] text-[var(--stock)] hover:opacity-85"
          : "border border-[var(--rule-strong)] hover:bg-[rgba(12,12,13,0.06)]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/**
 * The masthead, and beneath it the transmission tape.
 *
 * The tape is scroll position drawn as tape running left to right, which is
 * the one piece of chrome this world requires: an as-live script always shows
 * how far through the transmission you are. It is driven by writing
 * `transform` straight onto the element rather than by setting a custom
 * property on a parent, because an inherited variable recalculates styles for
 * every descendant on every frame.
 */
function Masthead() {
  const tape = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const t = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        if (tape.current) tape.current.style.transform = `scaleX(${t})`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="rule-b flex items-center gap-4 px-4 py-3 md:px-8">
        <Link
          href="/"
          className="press flex shrink-0 items-center gap-2.5"
          aria-label="Explainaloud, home"
        >
          <ExplainaloudMark className="h-7 w-7" />
          {/* Lowercase, and no tracked capitals. `uppercase` here was doing
              the damage the rename was meant to undo — the string was set in
              caps by CSS, so lowering the letters in every other file left
              the one wordmark on the front door still shouting. */}
          <span className="font-semibold text-[0.98rem] tracking-[-0.01em] [font-stretch:87%]">
            explainaloud
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-7 lg:flex">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="group relative py-1">
              <Slug
                className={cn(
                  "transition-opacity duration-200",
                  current === s.id
                    ? "opacity-100 underline underline-offset-4"
                    : "group-hover:opacity-100",
                )}
              >
                {s.label}
              </Slug>
              {/* The current section is underscored by a rule that wipes in
                  rather than appearing, so moving between sections reads as
                  one mark travelling along the row. */}
              <span
                className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-[var(--ink)]"
                style={{
                  transform: `scaleX(${current === s.id ? 1 : 0})`,
                  transition: `transform 280ms ${EASE}`,
                }}
              />
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-7">
          {/* "Log in", not "Sign in". The form it opens is labelled "Log in",
              its own toggle says "Already a member? Log in", and every error
              message says logging in — one name for one action, or the pair
              reads as two different doors. */}
          <Link href="/login" className="press px-3 py-2">
            <Slug className="transition-opacity hover:opacity-100">Log in</Slug>
          </Link>
          <Cue href="/signup">Start</Cue>
        </div>
      </div>
      <div className="h-[2px] w-full bg-[rgba(12,12,13,0.08)]">
        <div
          ref={tape}
          className="h-full w-full origin-left bg-[var(--ink)]"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
    </header>
  );
}

/** A section head: the number in the gutter, the title against it. */
function SectionHead({
  n,
  title,
  lede,
}: {
  n: string;
  title: string;
  lede: string;
}) {
  return (
    <div data-rise="" className="grid grid-cols-[var(--gutter)_1fr] gap-x-4">
      <Slug className="tc pt-2">{n}</Slug>
      <div>
        {/* Sentence case, normal width, and a full stop.
         *
         * Caps at 92% width were the last thing on the page still using a
         * poster voice. Not one of the studio and product sites this design
         * was measured against sets a heading that way — they are all large,
         * heavy, sentence case, in a neutral grotesk, and that difference is
         * most of what reads as professional rather than promotional. The type
         * is still Archivo and still heavier and tighter than the body; it has
         * simply stopped performing. */}
        {/* `mask-line` reveals the heading from behind its own baseline as the
            block arrives: the line is a window with `overflow: hidden` and the
            words start below it, so nothing fades — the sentence is not there
            and then it is. It costs nothing here because the rule keys off the
            `data-rise` state this block already has. */}
        <h2 className="mask-line max-w-[24ch] font-display font-normal text-[clamp(1.9rem,3.8vw,3rem)] leading-[1.15] tracking-[-0.015em]">
          <span>{title}</span>
        </h2>
        <p className="mt-5 max-w-[54ch] text-[1.05rem] leading-[1.65] opacity-80">
          {lede}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * 01 — The first viewport
 * ---------------------------------------------------------------------- */

/** Every run in the take, in order, so one word clock drives all three lines. */
const TAKE_RUNS = TAKE.flatMap((line) => line.runs);

/** Where each line starts on that clock. */
const TAKE_OFFSETS = TAKE.reduce<number[]>((acc, _line, i) => {
  const before =
    i === 0
      ? 0
      : acc[i - 1] +
        TAKE[i - 1].runs.reduce((n, run) => n + wordCount(run[0]), 0);
  acc.push(before);
  return acc;
}, []);

/**
 * A fragment of real output, floated beside the headline.
 *
 * Steep's hero scatters product UI around the sentence rather than framing one
 * screenshot beside it, and these are the smallest honest unit of what this
 * product returns: a marked clause, and a claim that was never reached. Both
 * are authored demonstration material, marked exactly as the grader would mark
 * them.
 *
 * A real shadow, unlike anything else on the page. It is the one place the
 * system allows elevation, because these are the only elements that overlap
 * the text they belong to and need to read as sitting above it.
 */
function Artifact({
  children,
  className,
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  /** The verdict this fragment carries, drawn as an edge. */
  accent?: string;
}) {
  return (
    <div
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
      className={cn(
        "panel-live glass-panel rounded-[20px] p-5 text-left",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The hero's own scroll progress, 0 to 1 across the first viewport.
 *
 * Written as a custom property onto the section element once per frame, and
 * read from CSS by the wordmark and the two floating panels. Two deliberate
 * choices behind that:
 *
 * - **A property on one element, not React state.** Setting state per frame
 *   re-renders the whole hero — the take, the level meter, every artifact —
 *   sixty times a second to move two things.
 * - **Scoped to the hero rather than the document.** An inherited variable on
 *   `:root` invalidates style for every node on the page on every frame, which
 *   is the version of this that shows up as jank on a phone.
 *
 * It stops updating once the hero is fully behind you, and never starts under
 * `prefers-reduced-motion`.
 */
function useHeroScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        /* Against the viewport rather than the section's own height: the
           gesture people make is "scroll past the first screen", and tying it
           to a section that is taller than the window means the effect is only
           half finished by the time the section has left. */
        const t = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
        el.style.setProperty("--hero-t", t.toFixed(4));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}

function Hero() {
  const [cued, setCued] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const take = useTakeArriving(TAKE_RUNS);
  const heroRef = useHeroScroll<HTMLElement>();

  /* Cue on the next frame rather than during mount, so the wipe has one
     unmarked frame to travel across. Started synchronously it is already
     finished before the browser has painted. */
  useEffect(() => {
    const id = requestAnimationFrame(() => setCued(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /* The take covers the first 30 seconds of a three-minute session. The clock
     counting is what makes the panel read as live rather than as a still of a
     recording — and it stops at the end instead of looping, because a loop
     would be decoration rather than a demonstration. */
  useEffect(() => {
    if (elapsed >= 30) return;
    const id = window.setTimeout(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearTimeout(id);
  }, [elapsed]);

  return (
    <>
      {/* The first viewport is a stage, and the type is what stands on it.
       *
       * Two earlier attempts put ordinary-sized type on a coloured box, first
       * black and then deep blue, and a box with small type on it is a
       * container rather than an image. The references that have no
       * photography do not do that: Leonardo builds its entire opening out of
       * letterforms at architectural scale in one saturated colour on black,
       * and Josephmark carries whole sections on lettering in a colour field.
       * The black is a stage the type stands on and the colour lives in the
       * words.
       *
       * That is exactly available to this product, because the marking is
       * already the colour. Set at this size the headline stops being a
       * sentence with highlights in it and becomes the picture — the green and
       * the amber are the composition, and they mean what they mean everywhere
       * else on the page.
       *
       * On white rather than on black. A black ground made the type louder and
       * the rest of the page an afterthought; the same letterforms on paper
       * are just as large and let the panels underneath belong to the same
       * document instead of following an interruption. */}
      {/* No forced height.
       *
       * This was `min-h-[92vh] justify-between`, which reserved most of a
       * screen and then spread whatever was in it to the corners. The content
       * needs about three-quarters of that, so the difference came out as
       * empty space — and every attempt to fix it was an attempt to fill the
       * gap rather than to stop making one. Sized by what is in it, with real
       * padding round it, there is nothing left over. */}
      {/* A centred editorial hero, with the product floating around it.
       *
       * The previous composition was a two-column split: claim on the left,
       * demonstration panel on the right. It is the arrangement every SaaS
       * landing page uses, and swapping the typeface into it did not change
       * that - the page still read as the same page in different clothes.
       *
       * This one puts the sentence in the middle at full width and lets real
       * product output orbit it. The reference set does this consistently:
       * the headline is the composition, and the interface fragments are
       * scattered evidence rather than one framed screenshot. It also suits
       * what is being said. A sentence about explaining something out loud
       * should be set the way a sentence is set, not squeezed into a column
       * beside a picture. */}
      <section
        ref={heroRef}
        className="hero-scroll paper [container-type:inline-size] px-4 pt-14 pb-20 md:px-8 md:pt-16 md:pb-28"
      >
        {/* The name, at the size the name should be.
         *
         * Set in Archivo at the top of its width axis rather than in the
         * display serif: a wordmark and a headline in the same face at the
         * same moment compete, and the one that loses is the sentence, which
         * carries the meaning. Expanded grotesque against a serif sentence is
         * a real contrast rather than a size difference.
         *
         * Sized with `min()` in an inline style, not a viewport unit in a
         * class. `vw` keeps growing after the page has stopped: past the
         * measure the content is capped at 84rem while `12vw` is not, so on a
         * wide display the word ran straight off the side. The rem term is
         * what catches it. Inline because a Tailwind arbitrary value
         * containing a comma does not generate.
         *
         * Tracking goes positive, against everything else on the page. A
         * wordmark is read as letters in sequence rather than as a word
         * shape, and letters need air to be read that way. */}
        {/* It also reacts to the scroll: settling back a little and thinning
            out as you leave the first screen, so the name hands the page over
            to the sentence rather than sitting at full strength above content
            it has stopped introducing. The ink fades down the glyphs for the
            same reason — the word emerges from the stock instead of being
            printed on top of it. */}
        <p
          aria-hidden="true"
          style={{ fontSize: "min(9.4cqw, 8.5rem)" }}
          className="hero-mark fill-fade-ink select-none whitespace-nowrap text-center font-semibold leading-[0.95] tracking-[0.01em] [font-stretch:125%]"
        >
          EXPLAINALOUD
        </p>

        <div className="relative mx-auto max-w-[46rem] text-center">
          <h1 className="mx-auto mt-7 max-w-[22ch] pb-1 font-display font-normal text-[clamp(1.7rem,3.4vw,2.6rem)] leading-[1.2] tracking-[-0.012em] opacity-90">
            <MarkedLine
              runs={HEADLINE}
              cued={cued}
              baseDelay={350}
              step={340}
            />
          </h1>

          <p className="mx-auto mt-7 max-w-[46ch] text-[1.05rem] leading-[1.65] opacity-70">
            Upload your notes, talk through them for three minutes, and read
            back which claims you got right, which were vague, and what you
            skipped.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Cue href="/signup">Start a session</Cue>
            <Cue href="#marking" tone="outline">
              See how the marking works
            </Cue>
          </div>

          {/* Two fragments of real output, floated either side of the
           * headline on a wide screen and folded back into the flow below it
           * on a narrow one. `lg:absolute` is what does the folding: they are
           * ordinary blocks until there is room to orbit.
           *
           * They also drift as the hero scrolls, and at different rates — the
           * left one about twice as fast as the right. That difference is the
           * whole of parallax: matched rates would just be the page moving,
           * and it is the disagreement between them that reads as depth. */}
          <Artifact
            accent="var(--ok)"
            className="hero-drift-near lay-in-soft hero-orbit-left mt-10"
          >
            <p className="text-[0.95rem] leading-[1.6]">
              Forces come in pairs,{" "}
              <span
                style={{ color: "var(--ok)" }}
                className="italic underline decoration-1 underline-offset-[3px]"
              >
                equal and opposite
              </span>
              .
            </p>
            <p className="mt-3 text-[0.8rem] opacity-55">
              Marked as you said it
            </p>
          </Artifact>

          <Artifact
            accent="var(--miss)"
            className="hero-drift-far lay-in-soft hero-orbit-right mt-4"
          >
            <p className="text-[0.95rem] leading-[1.6]">
              <span style={{ color: "var(--miss)" }} className="italic">
                {NOT_SAID}
              </span>
            </p>
            <p className="mt-3 text-[0.8rem] opacity-55">Never said</p>
          </Artifact>
        </div>

        {/* The take itself, centred under the sentence rather than beside it. */}
        <div className="mx-auto mt-14 max-w-[42rem]">
          <div className="lay-in panel-live glass-panel rounded-[20px] p-5">
            {/* What is being explained, and what it was built from.
             *
             * The panel used to open straight into three marked sentences with
             * no idea what they were about or where the course came from, which
             * is the one thing somebody arriving needs in order to read the
             * rest of it. */}
            <div className="rule-b flex items-baseline justify-between gap-4 pb-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[1.02rem]">
                  Newton&apos;s laws
                </p>
                <Slug className="mt-0.5 block truncate">
                  From forces-notes.pdf
                </Slug>
              </div>
              {/* Named as a sample, not just as live.
               *
               * Everything in this panel is second-person — "so push a wall",
               * "you feel it in your hand" — and second-person sentences on a
               * landing page are read as instructions unless something says
               * otherwise. This is what says otherwise. */}
              <div className="flex shrink-0 items-baseline gap-3">
                <Slug className="opacity-55">Example</Slug>
                <Slug className="tc opacity-100">Live</Slug>
              </div>
            </div>

            {/* The level, while it is still being said.
             *
             * Bars only while the take is arriving, flat once it has stopped —
             * a meter that keeps moving after the talking has finished is
             * lying about what it is measuring. */}
            <div
              className="mt-4 flex h-6 items-end gap-[3px]"
              aria-hidden="true"
            >
              {LEVELS.map(({ height, delay }) => (
                <span
                  key={delay}
                  className={cn(
                    "flex-1 rounded-[1px] bg-[var(--ink)] opacity-25",
                    !take.done && "waveform-bar",
                  )}
                  style={{
                    height: `${height * 100}%`,
                    opacity: take.done ? 0.2 : 0.55,
                    animationDelay: `${delay}ms`,
                    transition: `opacity 500ms ${EASE}`,
                  }}
                />
              ))}
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <Slug className="opacity-100">Your take, as it lands</Slug>
              <Slug className="tc">wpm 128</Slug>
            </div>
            <div className="mt-4 space-y-3">
              {TAKE.map((line, i) => {
                const offset = TAKE_OFFSETS[i];
                return (
                  <div
                    key={line.at}
                    style={{
                      opacity: take.spoken > offset ? 1 : 0.2,
                      transition: `opacity 400ms ${EASE}`,
                    }}
                  >
                    <Slug className="tc mb-1 block">{line.at}</Slug>
                    {/* Two lines of room, reserved.
                     *
                     * The words arrive one at a time, so without a floor the
                     * paragraph rewraps from one line to two as it fills and
                     * the whole page below it steps down. Space is set aside
                     * for the finished sentence from the start. */}
                    <ArrivingLine
                      runs={line.runs}
                      offset={offset}
                      spoken={take.spoken}
                      className="block min-h-[3.3rem] text-[1.02rem] leading-[1.6]"
                    />
                  </div>
                );
              })}
            </div>
            <div
              className="mt-5 flex items-baseline gap-4 border-[var(--rule)] border-t pt-4"
              style={{
                opacity: take.done ? 1 : 0,
                transition: `opacity 420ms ${EASE} 500ms`,
              }}
            >
              <Slug className="tc shrink-0 text-[var(--miss)] opacity-100">
                Not said
              </Slug>
              {/* No reserved height here.
               *
               * This line copied the floor from the take lines above, which
               * exist because words arrive into them one at a time. This one
               * is a fixed sentence that appears whole, so the floor was
               * holding open a second line that never gets used. */}
              <p className="text-[1.02rem] text-[var(--miss)] italic leading-[1.6]">
                {NOT_SAID}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------
 * 02 — Running order
 * ---------------------------------------------------------------------- */

function RunningOrder() {
  return (
    <section
      id="order"
      /* The warm stock, not the deep field.
       *
       * This was the page's first inversion, two screens in, and it was
       * followed immediately by a return to white — so anybody scrolling the
       * top of the page adapted to near-black and back inside a few seconds.
       * The close still inverts, and is now the only thing that does, which
       * is what makes it read as an ending rather than as one more section. */
      /* No `rule-b`. The section now fades into the white below it, and a
         hairline drawn across that fade is a line where the whole point was
         that there is no line — the brief's "bleed rather than cut apart",
         undone by one border. */
      className="ground ground-warm scroll-mt-24 px-4 py-24 md:px-8 md:py-32"
    >
      <SectionHead
        n="02"
        title="Four minutes, start to finish."
        lede="Upload, wait, talk, read back. Nothing else to learn."
      />

      <div className="mt-16">
        {RUNNING_ORDER.map((row) => (
          <div
            key={row.n}
            data-rise=""
            /* No hover state.
             *
             * These rows carry a heading, a detail line and a duration, and
             * lighting the whole strip behind them on hover made the row look
             * selected rather than pointed at — a highlight on something that
             * is not a control and does nothing when you click it. The
             * detail is already there to read. */
            /* Dealt out rather than raised: `deal-in` alternates which side
               each row arrives from, so four rows read as a list being laid
               down instead of one gesture repeated four times. */
            className="deal-in rule-t grid grid-cols-[var(--gutter)_1fr_auto] items-start gap-x-4 py-7"
          >
            <Slug className="tc pt-2.5">{row.n}</Slug>
            <div>
              <h3 className="mask-line font-display font-normal text-[clamp(1.35rem,3vw,2rem)] leading-[1.15] tracking-[-0.01em]">
                <span>{row.item}</span>
              </h3>
              <p className="max-w-[58ch] pt-3 leading-[1.6] opacity-80">
                {row.detail}
              </p>
            </div>
            <Slug className="tc pt-2.5">{row.dur}</Slug>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------
 * 03 — Live marking, scrubbable
 * ---------------------------------------------------------------------- */

/**
 * A second take, in a different subject.
 *
 * Chemistry rather than the hero's physics, because the same explanation
 * marked twice down one page reads as one demo shown from two angles — and
 * because a study tool that only ever demonstrates itself on one subject looks
 * like a tool for that subject.
 */
const MARKING_TAKE: readonly {
  readonly at: string;
  readonly runs: readonly Run[];
}[] = [
  {
    at: "00:00:06",
    runs: [
      ["An ionic bond is one atom ", "plain"],
      ["giving an electron to another", "ok"],
      [".", "plain"],
    ],
  },
  {
    at: "00:00:14",
    runs: [
      ["They end up ", "plain"],
      ["with opposite charges", "ok"],
      [" and ", "plain"],
      ["stick together somehow", "vague"],
      [".", "plain"],
    ],
  },
];

/** Every markable run in that take, flattened, so a scrubber can index it. */
const SCRUB = MARKING_TAKE.flatMap((line) => line.runs).filter(
  (r) => r[1] !== "plain",
);
const SCORED = SCRUB.filter((r) => r[1] === "ok").length;

/**
 * The scrubber's own resolution, a hundred stops per claim.
 *
 * The control used to be one stop per claim, which made the handle jump six
 * times across the whole track and feel like a six-position switch rather than
 * a scrubber. The marking still lands claim by claim — that is what the
 * product does — but the thing under your finger moves continuously, which is
 * what a scrubber is.
 */
const SCRUB_RESOLUTION = 100;
const SCRUB_MAX = SCRUB.length * SCRUB_RESOLUTION;

function LiveMarking() {
  const { ref, visible } = useInView<HTMLElement>();
  const [scrub, setScrub] = useState(0);
  const [auto, setAuto] = useState(true);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const sliderId = useId();

  /* The take runs, holds on the finished result, and runs again.
   *
   * It used to walk to the end once and stop, which meant that unless you
   * happened to scroll here in the four seconds it was moving, the section was
   * a still picture of a slider — the one thing it exists not to be. It loops
   * now, with a beat at each end: a pause on the full result so the tally can
   * be read, and a shorter one at zero so the restart reads as a new take
   * rather than a glitch.
   *
   * Anyone who takes hold of the slider stops the loop for good. The auto-run
   * is there to show what the control does, not to fight the person using it.
   *
   * Driven frame by frame rather than by a timer per claim, so the handle
   * travels rather than hops, and measured from the timestamp the browser
   * hands the callback — a fixed increment per frame would run at half speed
   * on a 30Hz display and double on a 120Hz one. The position lives in a ref
   * as well as in state because the loop has to read it to decide when to
   * hold, and a state updater is not a place to make that decision: React
   * calls it twice in development. */
  const posRef = useRef(0);

  useEffect(() => {
    if (!visible || !auto) return;
    if (reduced) {
      posRef.current = SCRUB_MAX;
      setScrub(SCRUB_MAX);
      return;
    }

    let frame = 0;
    let last: number | null = null;
    /** Timestamp the current pause ends, or 0 when running. */
    let holdUntil = 0;

    const tick = (now: number) => {
      const dt = last === null ? 0 : now - last;
      last = now;

      if (holdUntil) {
        if (now >= holdUntil) {
          holdUntil = 0;
          // Only ever rewind from a full take, so the pause at zero is the
          // start of the next run rather than a second stop.
          if (posRef.current >= SCRUB_MAX) {
            posRef.current = 0;
            setScrub(0);
            holdUntil = now + 420;
          }
        }
      } else {
        const next = Math.min(
          SCRUB_MAX,
          posRef.current + (dt / 900) * SCRUB_RESOLUTION,
        );
        posRef.current = next;
        setScrub(next);
        if (next >= SCRUB_MAX) holdUntil = now + 1_800;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, auto, reduced]);

  /* A claim is marked once the handle has passed it. */
  const pos = Math.floor(scrub / SCRUB_RESOLUTION);
  const counted = SCRUB.slice(0, pos);
  const correct = counted.filter((r) => r[1] === "ok").length;

  return (
    <section
      ref={ref}
      id="marking"
      className="ground ground-aura rule-b scroll-mt-24 px-4 py-24 md:px-8 md:py-32"
    >
      <SectionHead
        n="03"
        title="Marked while you are still talking."
        lede="Not a verdict at the end. Drag the scrubber."
      />

      {/* The demo floats on glass, as the chart in 04 and the hero's take do:
          this is product output, and everything the product returns sits on
          the same panel. */}
      <div
        data-rise=""
        className="lay-in panel-live glass-panel mt-16 grid grid-cols-[var(--gutter)_1fr] gap-x-4 rounded-[20px] p-5 md:p-7"
      >
        <div />
        <div className="grid gap-10 lg:grid-cols-[1fr_15rem]">
          <div>
            <Slug className="mb-4 block opacity-55">
              Example take — chemistry
            </Slug>
            <p className="text-[clamp(1.15rem,2.9vw,1.9rem)] leading-[1.5]">
              {/* The take read as one continuous paragraph rather than as
                  timed lines, because here it is a piece of speech being
                  marked, not a running order. Each line carries its own
                  leading and trailing spaces, so the sentences need one more
                  between them or they run together at the join. */}
              {(() => {
                let seen = 0;
                return MARKING_TAKE.flatMap((line, li) => [
                  li > 0 ? <span key={`gap-${line.at}`}> </span> : null,
                  ...line.runs.map((run) => {
                    const marked = run[1] !== "plain";
                    const on = marked ? seen++ < pos : true;
                    return (
                      <Marked
                        key={`${line.at}:${run[1]}:${run[0]}`}
                        run={run}
                        cued={on}
                        delay={0}
                      />
                    );
                  }),
                ]);
              })()}
            </p>

            <div className="mt-10">
              <label htmlFor={sliderId}>
                <Slug>Scrub the take {auto ? "— running" : "— yours"}</Slug>
              </label>
              {/* The travelled part of the track is painted by a hard-stopped
                  gradient on the input itself, so there is one element rather
                  than a track, a fill and a handle stacked on each other. */}
              <input
                id={sliderId}
                type="range"
                min={0}
                max={SCRUB_MAX}
                step={1}
                value={Math.round(scrub)}
                aria-valuetext={`${counted.length} of ${SCRUB.length} claims marked`}
                onChange={(e) => {
                  setAuto(false);
                  posRef.current = Number(e.target.value);
                  setScrub(posRef.current);
                }}
                className="mt-3 h-[5px] w-full cursor-ew-resize appearance-none rounded-full accent-[var(--ink)]"
                style={{
                  background: `linear-gradient(to right, var(--ink) ${(scrub / SCRUB_MAX) * 100}%, rgba(12,12,13,0.16) ${(scrub / SCRUB_MAX) * 100}%)`,
                }}
              />
            </div>
          </div>

          {/* The tally. These numbers exist because they move with the scrubber;
            standing still they would be a stat block, which is the thing this
            page is built to avoid. */}
          <div className="rule-t self-start pt-6 lg:border-t-0 lg:border-l lg:border-l-[var(--rule)] lg:pt-0 lg:pl-8">
            <Slug>Claims covered</Slug>
            <p className="tc mt-3 font-semibold text-[clamp(3rem,9vw,4.25rem)] leading-none tracking-[-0.04em] [font-stretch:78%]">
              {correct}
              <span className="opacity-25">/{SCORED}</span>
            </p>
            <dl className="mt-7 space-y-3">
              {(["ok", "vague", "miss"] as const).map((v) => (
                <div key={v} className="flex items-baseline gap-3">
                  <span
                    className="h-[10px] w-[10px] shrink-0 translate-y-[-1px] rounded-full"
                    style={{ background: `var(--${v})` }}
                  />
                  <dt>
                    <Slug>{VERDICT_LABEL[v]}</Slug>
                  </dt>
                  {/* The missing claim arrives at the end, not at the start.
                   *
                   * This read `v === "miss" ? 1 : ...` - a literal, so the row
                   * said "missing a step: 1" at every scrubber position
                   * including zero, and never once changed while you dragged
                   * it. Two things wrong with that. It is the only number on a
                   * panel built entirely on numbers that move, so it reads as
                   * broken. And it is not true yet: at the start of a take
                   * nothing has been skipped, because nothing has been said.
                   * You cannot miss a step you have not reached. */}
                  <dd className="tc ml-auto font-mono text-[0.72rem] tabular-nums">
                    {v === "miss"
                      ? counted.length === SCRUB.length
                        ? 1
                        : 0
                      : counted.filter((r) => r[1] === v).length}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------
 * 04 — Pace
 * ---------------------------------------------------------------------- */

/**
 * Articulation rate against a personal baseline.
 *
 * Real quantities drawn to scale rather than a sparkline: each bar is one
 * eight-second window of the take above. The baseline rule runs across them
 * instead of under them, because getting ahead of your own baseline is the
 * thing worth seeing and it should be legible as a crossing.
 */
const PACE = [128, 141, 96, 173, 168, 118, 104, 152] as const;
const BASELINE = 134;
const RACING = BASELINE * 1.15;

function Pace() {
  const { ref, visible } = useInView<HTMLElement>();
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(...PACE) * 1.15;

  return (
    <section
      ref={ref}
      id="pace"
      className="ground ground-tint rule-b scroll-mt-24 px-4 py-24 md:px-8 md:py-32"
    >
      <SectionHead
        n="04"
        title="Fast is not the same as fluent."
        lede="Measured against your own baseline, so thinking time is not held against you. Racing usually means reciting."
      />

      {/* The chart floats, as the hero's take does. Before this it was the one
          piece of product output on the page sitting flat on the stock, which
          made section 04 read as a different page from the one above it. */}
      <div
        data-rise=""
        className="lay-in panel-live glass-panel mt-16 grid grid-cols-[var(--gutter)_1fr] gap-x-4 rounded-[20px] p-5 md:p-7"
      >
        <Slug className="tc pt-1">wpm</Slug>
        <div>
          <div className="relative flex h-[clamp(9rem,20vw,14rem)] items-end gap-[3px]">
            {PACE.map((v, i) => (
              <button
                type="button"
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed literal.
                key={i}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`Window ${i + 1}: ${v} words per minute${v > RACING ? ", racing" : ""}`}
                className="relative block flex-1 self-end rounded-t-[4px] focus:outline-none"
                style={{
                  height: visible ? `${(v / peak) * 100}%` : "0%",
                  background: v > RACING ? "var(--vague)" : "var(--ink)",
                  opacity: hover === null || hover === i ? 1 : 0.3,
                  transition: `height 720ms ${EASE} ${i * 55}ms, opacity 180ms ease-out`,
                }}
              >
                <span
                  className={cn(
                    "tc -translate-x-1/2 absolute bottom-full left-1/2 mb-2 font-mono text-[0.6rem] transition-opacity duration-150",
                    hover === i ? "opacity-100" : "opacity-0",
                  )}
                >
                  {v}
                </span>
              </button>
            ))}

            <div
              className="pointer-events-none absolute inset-x-0 border-[var(--ink)] border-t border-dashed"
              style={{
                bottom: `${(BASELINE / peak) * 100}%`,
                opacity: visible ? 0.6 : 0,
                transition: `opacity 500ms ${EASE} 720ms`,
              }}
            >
              <Slug className="tc absolute right-0 bottom-2 bg-[var(--stock)] px-2 opacity-100">
                Your baseline {BASELINE}
              </Slug>
            </div>
          </div>

          <div className="rule-t mt-3 flex items-baseline justify-between pt-2">
            <Slug className="tc">00:00</Slug>
            {/* Ten, because that is what the product measures over —
                `RATE_WINDOW_SECONDS` in `speech-metrics.ts`. The page said
                eight, which was a number nothing in the code produced. Eight
                bars at ten seconds is 1:20, not 1:04. */}
            <Slug>Ten-second windows</Slug>
            <Slug className="tc">01:20</Slug>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------
 * 05 — Sources only
 * ---------------------------------------------------------------------- */

/* A third subject. Physics in the hero, chemistry in 03, American history
   here — the page demonstrates itself on the range of things people actually
   study rather than on one of them three times. */
const COURSE = [
  { point: "What the Stamp Act actually taxed", inSource: true },
  { point: "Why representation was the objection", inSource: true },
  { point: "The road from Boston to Lexington", inSource: true },
  { point: "Why the Articles of Confederation failed", inSource: false },
  { point: "Federalists against Anti-Federalists", inSource: false },
  { point: "How the Bill of Rights was added", inSource: false },
] as const;

const IN_SOURCE = COURSE.filter((r) => r.inSource).length;

function SourcesOnly() {
  const [strict, setStrict] = useState(false);

  return (
    <section
      id="sources"
      className="ground ground-tint-soft rule-b scroll-mt-24 px-4 py-24 md:px-8 md:py-32"
    >
      <SectionHead
        n="05"
        /* Was "A short course is a correct answer." — an aphorism that needs
           the paragraph under it to decode, in the slot that is supposed to be
           the decoding. The section is about where the material comes from, so
           the title now says that and the lede keeps the promise. */
        title="Built from your files, and nothing else."
        lede="What your files do not cover gets named, not invented."
      />

      {/* The switch and its list float on glass, as the chart in 04 does:
          this is the course the product built, and product output sits on
          the same panel everywhere on the page. */}
      <div
        data-rise=""
        className="lay-in panel-live glass-panel mt-16 grid grid-cols-[var(--gutter)_1fr] gap-x-4 rounded-[20px] p-5 md:p-7"
      >
        <div />
        <div>
          <Slug className="mb-5 block opacity-55">
            Example course — American history
          </Slug>
          {/* A working switch, not a picture of one. */}
          <button
            type="button"
            role="switch"
            aria-checked={strict}
            onClick={() => setStrict((s) => !s)}
            className="press inline-flex items-center gap-4 focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--ink)] focus-visible:outline-offset-4"
          >
            <span
              className={cn(
                "relative block h-7 w-[3.25rem] shrink-0 rounded-full transition-colors duration-200",
                strict ? "bg-[var(--ink)]" : "bg-[rgba(12,12,13,0.18)]",
              )}
            >
              <span
                className="absolute top-1 left-1 block h-5 w-5 rounded-full bg-white"
                style={{
                  transform: `translateX(${strict ? 24 : 0}px)`,
                  transition: `transform 240ms ${EASE}`,
                }}
              />
            </span>
            <span className="font-mono text-[0.72rem] uppercase tracking-[0.09em]">
              Sources only{" "}
              <span className={strict ? "" : "opacity-45"}>
                {strict ? "on" : "off"}
              </span>
            </span>
          </button>

          <ul className="mt-10">
            {COURSE.map((row) => {
              const dropped = strict && !row.inSource;
              return (
                <li
                  key={row.point}
                  className="rule-t grid grid-cols-[1fr_auto] items-center gap-4 py-4"
                >
                  <span
                    className="text-[1.02rem] leading-[1.45]"
                    style={{
                      opacity: dropped ? 0.45 : 1,
                      // `textDecorationLine`, not the `textDecoration`
                      // shorthand: React warns when a shorthand and one of its
                      // longhands are both set, and the warning is right — the
                      // order they are applied in during a re-render decides
                      // which colour wins.
                      textDecorationLine: dropped ? "line-through" : "none",
                      textDecorationColor: "var(--miss)",
                      textDecorationThickness: "2px",
                      transition: `opacity 260ms ${EASE}`,
                    }}
                  >
                    {row.point}
                  </span>
                  <Slug
                    className={cn(
                      "text-right",
                      dropped && "text-[var(--miss)] opacity-100",
                    )}
                  >
                    {dropped ? "Not in your material" : "Covered"}
                  </Slug>
                </li>
              );
            })}
          </ul>

          <p className="rule-t pt-4">
            <Slug className={strict ? "opacity-100" : undefined}>
              {strict
                ? `${IN_SOURCE} key points. ${COURSE.length - IN_SOURCE} gaps named instead of filled.`
                : `${COURSE.length} key points, ${COURSE.length - IN_SOURCE} of them researched beyond your files.`}
            </Slug>
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------
 * 06 — Walk the whole loop
 * ---------------------------------------------------------------------- */

/**
 * The last section before the ask, and the only one that shows the sequence.
 *
 * Everything above demonstrates a slice — the hero marks a take, 03 scrubs
 * one, 04 charts a pace, 05 toggles the source rule. All true, none of them
 * answering "what is it like to use this", because the product is a sequence
 * and a slice cannot show one. This is where somebody who has read that far
 * finds out, immediately before being asked to sign up.
 *
 * `ground-aura` rather than a tint: the take on step three carries marked
 * words, and the pure ground is what keeps the three verdicts reading exactly
 * as they will inside the product.
 */
function TryItSection() {
  return (
    <section
      id="try"
      className="ground ground-aura rule-b scroll-mt-24 px-4 py-24 md:px-8 md:py-32"
    >
      <SectionHead
        n="06"
        title="See the whole thing, in four steps."
        lede="Pick a subject and walk it through — material in, course out, your take marked, the gaps named."
      />

      <div className="mt-16 grid grid-cols-[var(--gutter)_1fr] gap-x-4">
        <div />
        <TryIt />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------
 * Close
 * ---------------------------------------------------------------------- */

function Close() {
  return (
    <section className="tx-invert ground ribbon px-4 py-28 md:px-8 md:py-36">
      <div data-rise="" className="grid grid-cols-[var(--gutter)_1fr] gap-x-4">
        <div className="pt-3">
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.09em]">
            <span className="tally-lamp mr-2 inline-block h-[7px] w-[7px] translate-y-[-1px] rounded-full bg-white align-middle" />
            On air
          </span>
        </div>
        <div>
          <h2 className="mask-line max-w-[18ch] font-display font-normal text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.12] tracking-[-0.015em]">
            {/* The page marking its own copy, with the same wipe the recorder
                uses on yours — the one animation here that is also an
                argument. */}
            <span>
              Find out{" "}
              <span
                className="wipe-mark"
                style={{ "--wipe-colour": "#ffffff" } as React.CSSProperties}
              >
                before it matters
              </span>
              .
            </span>
          </h2>
          <p className="mt-8 max-w-[32ch] text-[1.15rem] leading-[1.55] opacity-90">
            Free to start. Nothing you say is stored.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Cue
              href="/signup"
              /* Sunset ink, not the ultramarine this button kept from the
                 palette before last. It was the only blue left on the page. */
              className="justify-center bg-white text-[var(--brand-deep)] hover:bg-white/90 sm:justify-start"
            >
              Start a session
            </Cue>
            <Cue
              href="/login"
              tone="outline"
              className="justify-center hover:bg-white/10 sm:justify-start"
            >
              Log in
            </Cue>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-8 md:px-8">
      <span className="flex items-center gap-2">
        <ExplainaloudMark className="h-5 w-5" />
        {/* Not `Slug`. That is the tracked-mono instrument voice used for
            metadata all over this page, and the wordmark is not metadata. */}
        <span className="font-semibold text-[0.88rem] tracking-[-0.01em]">
          explainaloud
        </span>
      </span>
      <Link href="/terms" className="ml-auto">
        <Slug className="transition-opacity hover:opacity-100">Terms</Slug>
      </Link>
      <Link href="/privacy">
        <Slug className="transition-opacity hover:opacity-100">Privacy</Slug>
      </Link>
    </footer>
  );
}

/* -------------------------------------------------------------------------
 * The page
 * ---------------------------------------------------------------------- */

export default function Home() {
  // Keep the previous landing implementation available while this visual
  // direction is being reviewed. Nothing is deleted until the concept wins.
  void [
    Masthead,
    Hero,
    RunningOrder,
    LiveMarking,
    Pace,
    SourcesOnly,
    TryItSection,
    Close,
    Footer,
  ];
  return <LandingRedesign />;
}
