"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { ExplainaloudMark } from "~/components/explainaloud-mark";
import { ScrollReveal } from "~/components/scroll-reveal";
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
const HEADLINE: readonly Run[] = [
  ["Say it out loud, and turn ", "plain"],
  ["sort of", "vague"],
  [" into ", "plain"],
  ["certain", "ok"],
  [".", "plain"],
];

/**
 * A real explanation, marked the way the product marks one.
 *
 * Authored demonstration material, not a recording of anybody: the topic is
 * mitosis because it is the kind of thing people are sure they understand
 * until they have to say it in order. Every verdict is one the grader would
 * actually reach — the missed step is genuinely missed, and the vague run is
 * vague rather than wrong.
 */
const TAKE: readonly {
  readonly at: string;
  readonly runs: readonly Run[];
}[] = [
  {
    at: "00:00:04",
    runs: [
      ["So mitosis is how one cell becomes ", "plain"],
      ["two identical daughter cells", "ok"],
      [", and it starts with the DNA ", "plain"],
      ["being copied", "ok"],
      [".", "plain"],
    ],
  },
  {
    at: "00:00:12",
    runs: [
      ["Then the chromosomes ", "plain"],
      ["sort of line up in the middle", "vague"],
      [" and get pulled apart.", "plain"],
    ],
  },
  {
    at: "00:00:21",
    runs: [
      ["After that the cell ", "plain"],
      ["splits down the middle", "ok"],
      [" and you have two of them.", "plain"],
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
const NOT_SAID = "the spindle fibres attach at the centromere";

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
 * The chain of agents, written as a handover rather than as a log.
 *
 * The first version of this section was five timestamped lines and it read
 * like a table of contents: five names, five numbers, no visible relationship
 * between them. The thing worth understanding is not that five agents ran, it
 * is that the third one throws away the second one's work — so each step now
 * names what it was handed, what it did, and what it passed on, and the audit
 * step shows the two claims it actually cut.
 *
 * `takes`/`gives` are the handover. `cut` is only set where something was
 * thrown away, and it is the whole point of the section.
 */
const CHAIN: readonly {
  readonly who: string;
  readonly takes: string;
  readonly does: string;
  readonly gives: string;
  /** Only the audit step throws anything away. */
  readonly cut?: readonly string[];
}[] = [
  {
    who: "Research",
    takes: "Your files, and the topic",
    does: "Finds what a good course on this would cover.",
    gives: "12 sources read, 4 worth keeping",
  },
  {
    who: "Architect",
    takes: "4 sources, your files",
    does: "Drafts the key points you will be graded against, each tied to a quote.",
    gives: "9 key points drafted",
  },
  {
    who: "Audit",
    takes: "9 key points",
    does: "Checks every claim against your files. It sees the quotes, not the reasoning.",
    gives: "7 upheld",
    cut: [
      "Checkpoint control and p53",
      "Comparison with binary fission in prokaryotes",
    ],
  },
  {
    who: "Revise",
    takes: "7 upheld, 2 rejected",
    does: "Rewrites around the holes. A shorter course is the right answer.",
    gives: "7 key points, final",
  },
  {
    who: "Questions",
    takes: "7 key points",
    does: "Writes the interview bank. No question repeats one you have answered.",
    gives: "24 questions, none repeating",
  },
];

const SECTIONS = [
  { id: "order", label: "Running order" },
  { id: "marking", label: "Live marking" },
  { id: "pace", label: "Pace" },
  { id: "sources", label: "Sources only" },
  { id: "chain", label: "The chain" },
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
 * The field behind the first viewport
 * ---------------------------------------------------------------------- */

/**
 * A waveform tile that repeats without a seam.
 *
 * Every term is a whole number of cycles across the tile width, so the last
 * sample lands exactly where the first one starts and two tiles laid side by
 * side join invisibly. That is the entire reason the drift below can be a
 * single linear translate rather than a simulation.
 *
 * Computed at module scope from a fixed formula — no randomness anywhere, so
 * the server and the browser draw the same path and hydration has nothing to
 * argue about.
 */
const TILE_W = 1200;
const TILE_H = 220;

function wavePath(amplitude: number, phase: number) {
  const points: string[] = [];
  for (let x = 0; x <= TILE_W; x += 8) {
    const t = (x / TILE_W) * Math.PI * 2;
    const y =
      TILE_H / 2 +
      amplitude *
        (Math.sin(3 * t + phase) +
          0.55 * Math.sin(7 * t + phase * 1.7) +
          0.3 * Math.sin(11 * t + phase * 2.3));
    points.push(`${x},${y.toFixed(1)}`);
  }
  return `M ${points.join(" L ")}`;
}

/* Two layers, and both close to invisible.
 *
 * The first version ran three at up to half opacity and it took the page over:
 * the sentence in front of it was the thing you stopped being able to read,
 * which is the opposite of the job. At 0.14 and 0.08 the field registers as
 * texture in the corner of the eye and disappears the moment you look at a
 * word, and the drift is slow enough that nothing in it ever catches. */
const WAVES = [
  { d: wavePath(52, 0), opacity: 0.14, seconds: 90, width: 1 },
  { d: wavePath(78, 2.4), opacity: 0.08, seconds: 140, width: 1 },
] as const;

/**
 * The signal running through the on-air strip.
 *
 * Stripe's version of "a thing that runs on the page" is an animated gradient
 * mesh behind the hero, and that is the one shape of background this page's
 * rules refuse outright. This is the same intent taken somewhere it belongs: a
 * transmission strip carries a level meter, the meter never stops, and because
 * it is fifteen pixels tall inside a band that is already there it cannot
 * compete with anything.
 *
 * Same seamless tile as the field below, stroked in white and running faster,
 * because a meter that crawls reads as broken.
 */
function SignalStrip() {
  return (
    <div
      aria-hidden="true"
      className="relative ml-auto hidden h-4 w-40 overflow-hidden md:block lg:w-72"
    >
      <div
        className="wave-drift absolute inset-y-0 left-0 flex w-[200%]"
        style={{ animationDuration: "9s" }}
      >
        {[0, 1].map((copy) => (
          <svg
            key={copy}
            className="h-full w-1/2 shrink-0"
            viewBox={`0 0 ${TILE_W} ${TILE_H}`}
            preserveAspectRatio="none"
            fill="none"
            role="presentation"
          >
            <path
              d={WAVES[0].d}
              stroke="#ffffff"
              strokeWidth={1}
              strokeOpacity={0.7}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Chrome
 * ---------------------------------------------------------------------- */

/**
 * What a panel carries besides its content.
 *
 * The page was legible and empty. These are the two devices the reference
 * sites use to give a section presence without putting a picture in it, and
 * both are made of something the section already has rather than of
 * decoration invented for the gap.
 *
 * The numeral is the section's own index, set at about a quarter of the
 * viewport and run off the right edge so only part of it is in frame. Every
 * editorial site on the list does some version of this, and Leonardo builds
 * its entire opening out of it: letterforms at a scale where they stop being
 * read and start being seen. At five per cent of the panel's accent it is
 * texture — you notice the page has something in it, not what.
 *
 * There was a 3px rule in the accent along each panel's top edge too, and it
 * had to go. On the pace panel that meant a single magenta line with nothing
 * else magenta anywhere near it, which reads as a stray border rather than as
 * a system — a colour needs more than one appearance in a panel before a bare
 * rule in it means anything. The numeral and the section index carry the
 * accent between them, and that is enough.
 */
function PanelDecor({ n, side }: { n: string; side: "left" | "right" }) {
  return (
    <div
      aria-hidden="true"
      className="-z-10 pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Alternating sides down the page.
       *
       * Every numeral on the same edge reads as a fixed margin ornament — you
       * stop seeing it after the second one. Swapping sides means the eye
       * meets it somewhere new in each panel, which is what keeps it working
       * as texture rather than as furniture, and it sets up a slow zigzag
       * against the timecode ladder that runs down the left throughout. */}
      <span
        className={cn(
          "-translate-y-1/2 absolute top-1/2 hidden select-none font-semibold text-[24vw] text-[var(--accent)] leading-none tracking-[-0.05em] opacity-[0.05] [font-stretch:78%] md:block",
          side === "right" ? "-right-[3vw]" : "-left-[3vw]",
        )}
      >
        {n}
      </span>
    </div>
  );
}

/**
 * The ruled scale down a section's left margin.
 *
 * Absolutely positioned inside the section rather than placed in the gutter
 * cell of the grid, because it has to run the section's whole height and the
 * grid cell it would otherwise live in is only as tall as the label in it.
 */
function Ladder() {
  return (
    <div
      aria-hidden="true"
      className="ladder -z-10 pointer-events-none absolute top-0 bottom-0 left-4 hidden w-[var(--gutter)] md:left-8 md:block"
    />
  );
}

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
        "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
        tone === "solid"
          ? "bg-brand text-white hover:bg-brand-deep"
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
          <ExplainaloudMark className="h-7 w-7 text-brand" />
          <span className="font-semibold text-[0.92rem] uppercase tracking-[0.04em] [font-stretch:87%]">
            Explainaloud
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-7 lg:flex">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="group relative py-1">
              <Slug
                className={cn(
                  "transition-opacity duration-200",
                  current === s.id
                    ? "text-brand opacity-100"
                    : "group-hover:opacity-100",
                )}
              >
                {s.label}
              </Slug>
              {/* The current section is underscored by a rule that wipes in
                  rather than appearing, so moving between sections reads as
                  one mark travelling along the row. */}
              <span
                className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-brand"
                style={{
                  transform: `scaleX(${current === s.id ? 1 : 0})`,
                  transition: `transform 280ms ${EASE}`,
                }}
              />
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-7">
          <Link href="/login" className="press px-3 py-2">
            <Slug className="transition-opacity hover:opacity-100">
              Sign in
            </Slug>
          </Link>
          <Cue href="/signup">Start</Cue>
        </div>
      </div>
      <div className="h-[2px] w-full bg-[rgba(12,12,13,0.08)]">
        <div
          ref={tape}
          className="h-full w-full origin-left bg-brand"
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
        <h2 className="max-w-[22ch] font-semibold text-[clamp(1.7rem,3.6vw,2.7rem)] leading-[1.1] tracking-[-0.025em]">
          {title}
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

function Hero() {
  const [cued, setCued] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const take = useTakeArriving(TAKE_RUNS);

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
      <section className="paper accent-blue overflow-hidden px-4 py-10 md:px-8 md:py-14">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="inline-flex items-center rounded-full border border-[var(--rule)] px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.09em]">
            <span className="tally-lamp mr-2 inline-block h-[6px] w-[6px] rounded-full bg-[var(--miss)]" />
            Rec 00:{String(elapsed).padStart(2, "0")} of 03:00
          </span>
          <Slug>Marked as you speak</Slug>
          <SignalStrip />
        </div>

        {/* The headline at the size a name is set on a building. `[text-wrap:balance]`
            is deliberately off — the line breaks are part of the composition at
            this scale and balancing them evens the block into a paragraph. */}
        {/* The claim on the left, the thing being tested on the right.
         *
         * One grid of two rows rather than two grids stacked: the headline and
         * the copy take the left column in turn, and the take spans both, so
         * the panel runs the full height of the viewport and there is no
         * bottom-right corner left over to fill.
         *
         * A legend of the three verdict colours was tried in that corner and
         * removed: section 03 already carries exactly that list, and a hero
         * that explains its own colour code before anybody has scrolled is
         * answering a question nobody has asked yet. The corner itself then
         * went, with the fixed height that created it. */}
        <div className="grid items-start gap-x-12 gap-y-10 py-10 md:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,31rem)]">
          {/* One column, not two rows.
           *
           * The headline and the copy used to be separate rows of the outer
           * grid, which meant row one's height was set by whichever was taller
           * — the take panel — and the difference fell out as a hole under the
           * headline. Nested, they flow, and the two columns simply end where
           * their own content ends. */}
          <div className="flex flex-col">
            <h1 className="max-w-[13ch] font-semibold text-[clamp(2.6rem,7.4vw,6.4rem)] leading-[1.04] tracking-[-0.038em]">
              <MarkedLine
                runs={HEADLINE}
                cued={cued}
                baseDelay={350}
                step={340}
              />
            </h1>

            <div className="mt-9">
              <p className="max-w-[32ch] text-[1.02rem] leading-[1.6] opacity-75">
                Talk through a topic for three minutes. Get your own words back,
                marked. Nothing typed, no audio kept.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Cue href="/signup" className="justify-center sm:justify-start">
                  Start a session
                </Cue>
                {/* A link, not a second button.
                 *
                 * Two pills side by side read as a choice between two equal
                 * things, and these were never equal: one starts the product,
                 * the other scrolls down the page. Same label problem too —
                 * "See it mark" sounded like an alternative way in rather than
                 * a jump to the section that explains the marking. */}
                <a
                  href="#marking"
                  className="press inline-flex items-center justify-center py-3.5 font-medium text-[0.95rem] underline decoration-[var(--rule-strong)] underline-offset-4 transition-colors hover:decoration-current sm:justify-start"
                >
                  See how the marking works
                </a>
              </div>
            </div>
          </div>

          {/* The take, beside the headline.
           *
           * The right of the first viewport went through a constellation, a
           * drawn figure and a gradient panel before this, and all three were
           * the same mistake: something invented to fill a space. The proof
           * was already on the page, sitting in a strip along the foot where
           * nobody arriving would read it. It belongs here — you read the
           * claim on the left and watch it being tested on the right, in one
           * movement, which is the product. */}
          {/* Sized to finish level with the button beside it.
           *
           * The panel used to overhang the left column by about eighty pixels,
           * which read as the composition having been assembled rather than
           * measured — the eye lines up two columns that start together and
           * expects them to end together. Nothing was removed to close that
           * gap; the spacing inside was simply tightened a notch throughout,
           * and the one floor that was reserving room it never needed came
           * out. The reserved height on the three take lines stays exactly as
           * it was, because that is what stops the page stepping down as the
           * words arrive. */}
          <div className="rounded-2xl border border-[var(--rule)] p-5">
            {/* What is being explained, and what it was built from.
             *
             * The panel used to open straight into three marked sentences with
             * no idea what they were about or where the course came from, which
             * is the one thing somebody arriving needs in order to read the
             * rest of it. */}
            <div className="rule-b flex items-baseline justify-between gap-4 pb-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[1.02rem]">Mitosis</p>
                <Slug className="mt-0.5 block truncate">
                  From cell-division.pdf
                </Slug>
              </div>
              <Slug className="tc shrink-0 text-[var(--accent)] opacity-100">
                Live
              </Slug>
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
                    "flex-1 rounded-[1px] bg-[var(--accent)]",
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
 * The ticker
 * ---------------------------------------------------------------------- */

/**
 * What the product actually does, in one line that never stops.
 *
 * Every item is a confirmed capability, not a claim: each one is implemented
 * and each one is described somewhere further down the page. The ticker is
 * where somebody who is not going to read six sections finds out what they
 * would have read.
 */
const TICKER = [
  "Coloured as you speak",
  "Pace against your own baseline",
  "Sources-only mode",
  "Every claim tied to a quote from your files",
  "Interview mode, never the same question twice",
  "PDF, Word, Markdown, HTML, CSV, LaTeX",
  "Half credit for half a point",
  "Nothing typed",
  "No audio kept",
] as const;

/**
 * The ticker rail.
 *
 * The track holds two identical copies of the list, so translating exactly
 * -50% lands copy two where copy one began and the loop has no seam. Hovering
 * pauses it, because a line of moving text you cannot finish reading is a tax
 * rather than a feature — and the pause is a `animation-play-state`, so it
 * stops where it is instead of snapping home.
 *
 * `aria-hidden` on the second copy: it is the same nine phrases again, and a
 * screen reader reading them twice is the seam made audible.
 */
function Ticker() {
  return (
    <div className="marquee rule-b overflow-hidden py-3.5">
      <div className="marquee-track flex w-max">
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 items-center"
          >
            {TICKER.map((item) => (
              <li key={item} className="flex items-center">
                <Slug className="whitespace-nowrap">{item}</Slug>
                {/* The mark itself as the separator, rather than a bullet or
                    a slash. It is already the page's one drawn shape. */}
                <ExplainaloudMark
                  className="mx-6 h-3.5 w-3.5 shrink-0 text-brand opacity-70"
                  strokeWidth={6}
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * 02 — Running order
 * ---------------------------------------------------------------------- */

function RunningOrder() {
  return (
    <section
      id="order"
      className="paper-grey accent-violet relative isolate rule-b scroll-mt-24 px-4 py-24 md:px-8 md:py-32"
    >
      <PanelDecor n="02" side="right" />
      <Ladder />
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
            className="rule-t grid grid-cols-[var(--gutter)_1fr_auto] items-start gap-x-4 py-7"
          >
            <Slug className="tc pt-2.5">{row.n}</Slug>
            <div>
              <h3 className="font-semibold text-[clamp(1.3rem,3.2vw,2.1rem)] leading-[1.05] tracking-[-0.02em] [font-stretch:87%]">
                {row.item}
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

/** Every markable run in the take, flattened, so a scrubber can index it. */
const SCRUB = TAKE.flatMap((line) => line.runs).filter((r) => r[1] !== "plain");
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
      className="paper accent-blue relative isolate rule-b scroll-mt-24 px-4 py-24 md:px-8 md:py-32"
    >
      <PanelDecor n="03" side="left" />
      <Ladder />
      <SectionHead
        n="03"
        title="Marked while you are still talking."
        lede="Not a verdict at the end. Drag the scrubber."
      />

      <div
        data-rise=""
        className="mt-16 grid grid-cols-[var(--gutter)_1fr] gap-x-4"
      >
        <div />
        <div className="grid gap-10 lg:grid-cols-[1fr_15rem]">
          <div>
            <p className="text-[clamp(1.15rem,2.9vw,1.9rem)] leading-[1.5]">
              {/* The take read as one continuous paragraph rather than as
                  timed lines, because here it is a piece of speech being
                  marked, not a running order. Each line carries its own
                  leading and trailing spaces, so the sentences need one more
                  between them or they run together at the join. */}
              {(() => {
                let seen = 0;
                return TAKE.flatMap((line, li) => [
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
                className="mt-3 h-[5px] w-full cursor-ew-resize appearance-none rounded-full accent-[var(--color-brand)]"
                style={{
                  background: `linear-gradient(to right, var(--color-brand) ${(scrub / SCRUB_MAX) * 100}%, rgba(12,12,13,0.16) ${(scrub / SCRUB_MAX) * 100}%)`,
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
                  <dd className="tc ml-auto font-mono text-[0.72rem] tabular-nums">
                    {v === "miss"
                      ? 1
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
      className="paper-grey accent-magenta relative isolate rule-b scroll-mt-24 px-4 py-24 md:px-8 md:py-32"
    >
      <PanelDecor n="04" side="right" />
      <Ladder />
      <SectionHead
        n="04"
        title="Fast is not the same as fluent."
        lede="Measured against your own baseline, so thinking time is not held against you. Racing usually means reciting."
      />

      <div
        data-rise=""
        className="mt-16 grid grid-cols-[var(--gutter)_1fr] gap-x-4"
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
                  background:
                    v > RACING ? "var(--vague)" : "var(--color-brand)",
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
            <Slug>Eight-second windows</Slug>
            <Slug className="tc">01:04</Slug>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------
 * 05 — Sources only
 * ---------------------------------------------------------------------- */

const COURSE = [
  { point: "How the two daughter cells end up identical", inSource: true },
  { point: "The four phases, in order", inSource: true },
  { point: "Where the spindle fibres attach", inSource: true },
  { point: "Checkpoint control, and what p53 does", inSource: false },
  { point: "What happens when mitosis goes wrong", inSource: false },
  { point: "Meiosis, and how it differs", inSource: false },
] as const;

const IN_SOURCE = COURSE.filter((r) => r.inSource).length;

function SourcesOnly() {
  const [strict, setStrict] = useState(false);

  return (
    <section
      id="sources"
      className="paper accent-violet relative isolate rule-b scroll-mt-24 px-4 py-24 md:px-8 md:py-32"
    >
      <PanelDecor n="05" side="left" />
      <Ladder />
      <SectionHead
        n="05"
        title="A short course is a correct answer."
        lede="Nothing beyond your files. What they do not cover gets named, not invented."
      />

      <div
        data-rise=""
        className="mt-16 grid grid-cols-[var(--gutter)_1fr] gap-x-4"
      >
        <div />
        <div>
          {/* A working switch, not a picture of one. */}
          <button
            type="button"
            role="switch"
            aria-checked={strict}
            onClick={() => setStrict((s) => !s)}
            className="press inline-flex items-center gap-4 focus:outline-none focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-4"
          >
            <span
              className={cn(
                "relative block h-7 w-[3.25rem] shrink-0 rounded-full transition-colors duration-200",
                strict ? "bg-brand" : "bg-[rgba(12,12,13,0.18)]",
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
              <span className={strict ? "text-brand" : "opacity-45"}>
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
            <Slug className={strict ? "text-brand opacity-100" : undefined}>
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
 * 06 — The chain
 * ---------------------------------------------------------------------- */

function Chain() {
  const { ref, visible } = useInView<HTMLElement>();

  /* The work moving down the chain, on a loop.
   *
   * `stage` is which agent currently holds it: everything before has run,
   * everything after is waiting. It advances once the section is on screen
   * rather than on mount, so the run is not already over by the time anybody
   * scrolls to it — and when it reaches the end it holds on the finished
   * chain, then starts a fresh course from the top.
   *
   * The hold at the end is the longest pause in the sequence and it is doing
   * work: the finished state is what the section is arguing for, and a chain
   * that snapped straight back to nothing would never let anybody read it.
   *
   * The audit step gets longer than the running steps for the same reason. It
   * is the one that rejects something, and the pause before the two cut claims
   * appear is what makes the rejection read as a decision rather than a
   * transition. */
  const [stage, setStage] = useState(0);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    if (!visible) return;
    if (reduced) {
      setStage(CHAIN.length);
      return;
    }
    const finished = stage >= CHAIN.length;
    const id = window.setTimeout(
      () => setStage(finished ? 0 : stage + 1),
      finished
        ? 3_200
        : stage === 0
          ? 400
          : CHAIN[stage - 1]?.cut
            ? 1_900
            : 1_100,
    );
    return () => window.clearTimeout(id);
  }, [visible, stage, reduced]);

  return (
    <section
      ref={ref}
      id="chain"
      className="paper-grey accent-blue relative isolate scroll-mt-24 px-4 py-24 md:px-8 md:py-32"
    >
      <PanelDecor n="06" side="right" />
      <Ladder />
      <SectionHead
        n="06"
        title="Nobody grades their own work."
        lede="One agent drafts. A second one that did not write it cuts anything it cannot trace to your files."
      />

      <div
        data-rise=""
        className="mt-16 grid grid-cols-[var(--gutter)_1fr] gap-x-4"
      >
        <Slug className="tc pt-6">chain</Slug>

        {/* A rule down the left of the whole list, so the five steps read as
            one thing being passed along rather than as five entries. The
            ultramarine line on top of it is the work itself: it draws down as
            each agent finishes and hands over, which is the one fact this
            section exists to make legible. */}
        <ol className="relative border-[var(--rule)] border-l">
          <span
            aria-hidden="true"
            className="-left-px absolute top-0 w-px origin-top bg-brand"
            style={{
              height: `${(Math.min(stage, CHAIN.length) / CHAIN.length) * 100}%`,
              transition: `height 700ms ${EASE}`,
            }}
          />

          {CHAIN.map((step, i) => {
            const done = stage > i;
            const working = stage === i;
            const reached = done || working;

            return (
              <li
                key={step.who}
                className="relative py-7 pl-8 md:pl-10"
                style={{
                  opacity: reached ? 1 : 0.35,
                  transition: `opacity 500ms ${EASE}`,
                }}
              >
                {/* The node. Hollow until the work reaches it, filled once it
                    has run, and pinging while it is the one holding the work.
                    The audit step fills red rather than ultramarine — the one
                    colour difference in the list marks the one step that can
                    say no. */}
                <span className="-left-[6px] absolute top-[2.3rem] block h-[11px] w-[11px]">
                  {working ? (
                    <span
                      className={cn(
                        "work-ping absolute inset-0 rounded-full border",
                        step.cut
                          ? "border-[var(--miss)]"
                          : "border-[var(--color-brand)]",
                      )}
                    />
                  ) : null}
                  <span
                    className={cn(
                      "absolute inset-0 rounded-full border-2 transition-colors duration-500",
                      reached
                        ? step.cut
                          ? "border-[var(--miss)] bg-[var(--miss)]"
                          : "border-brand bg-brand"
                        : "border-[var(--rule-strong)] bg-[var(--stock)]",
                    )}
                  />
                </span>

                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h3 className="font-semibold text-[clamp(1.15rem,2.4vw,1.6rem)] tracking-[-0.02em]">
                    {step.who}
                  </h3>
                  {/* The handover reads as a state, so it says what it is
                      doing while it is doing it. */}
                  <Slug className="tc">
                    {done ? (
                      <>
                        in: {step.takes} → out: {step.gives}
                      </>
                    ) : working ? (
                      <span className="text-brand-ink opacity-100">
                        Working on {step.takes.toLowerCase()}
                      </span>
                    ) : (
                      <span className="opacity-60">Waiting</span>
                    )}
                  </Slug>
                </div>

                <p className="mt-2.5 max-w-[58ch] leading-[1.65] opacity-80">
                  {step.does}
                </p>

                {/* What was thrown away, named. This is the section's argument
                    and it is the only place on the page where the product
                    tells you about something it decided not to give you — so
                    it arrives when the audit finishes, not before. */}
                {step.cut ? (
                  <div
                    className="mt-5 grid transition-[grid-template-rows,opacity] duration-500 ease-out"
                    style={{
                      gridTemplateRows: done ? "1fr" : "0fr",
                      opacity: done ? 1 : 0,
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="rounded-r-lg border-[var(--miss)] border-l-2 bg-[color-mix(in_srgb,var(--miss)_6%,transparent)] py-3 pr-4 pl-4">
                        <Slug className="text-[var(--miss)] opacity-100">
                          Cut, not traceable to your files
                        </Slug>
                        <ul className="mt-2 space-y-1">
                          {step.cut.map((claim) => (
                            <li
                              key={claim}
                              className="text-[0.95rem] text-[var(--miss)] leading-[1.5] line-through decoration-[var(--miss)]/50"
                            >
                              {claim}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------
 * Close
 * ---------------------------------------------------------------------- */

function Close() {
  return (
    <section className="tx-invert ribbon px-4 py-28 md:px-8 md:py-36">
      <div data-rise="" className="grid grid-cols-[var(--gutter)_1fr] gap-x-4">
        <div className="pt-3">
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.09em]">
            <span className="tally-lamp mr-2 inline-block h-[7px] w-[7px] translate-y-[-1px] rounded-full bg-white align-middle" />
            On air
          </span>
        </div>
        <div>
          <h2 className="max-w-[16ch] font-semibold text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.08] tracking-[-0.03em]">
            Find out before it matters.
          </h2>
          <p className="mt-8 max-w-[32ch] text-[1.15rem] leading-[1.55] opacity-90">
            Free to start. Nothing you say is stored.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Cue
              href="/signup"
              className="justify-center bg-white text-[#1b1585] hover:bg-white/90 sm:justify-start"
            >
              Start a session
            </Cue>
            <Cue
              href="/login"
              tone="outline"
              className="justify-center hover:bg-white/10 sm:justify-start"
            >
              Sign in
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
        <ExplainaloudMark className="h-5 w-5 text-brand" />
        <Slug className="opacity-100">Explainaloud</Slug>
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
  return (
    <main className="tx min-h-screen">
      {/* Reveals every block carrying `data-rise` below. One observer for the
          page; see the component for why it is wired this way. */}
      <ScrollReveal />
      <Masthead />
      <Hero />
      <Ticker />
      <RunningOrder />
      <LiveMarking />
      <Pace />
      <SourcesOnly />
      <Chain />
      <Close />
      <Footer />
    </main>
  );
}
