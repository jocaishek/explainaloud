"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ExplainaloudMark } from "~/components/explainaloud-mark";
import { DemoConsole } from "~/components/landing/demo-console";
import { FlowField } from "~/components/landing/flow-field";
import { FriendsAndStreaks } from "~/components/landing/friends-streaks";
import { GlassMark } from "~/components/landing/glass-mark";
import { SignupNudge } from "~/components/landing/signup-nudge";

const steps = [
  {
    number: "01",
    title: "Bring your talk or your material",
    body: "Slides, notes, a chapter. We pull out the points you need to hit.",
  },
  {
    number: "02",
    title: "Say it in your own words",
    body: "Three minutes, nothing to read off. Checked claim by claim as you speak.",
  },
  {
    number: "03",
    title: "Know exactly what to fix",
    body: "What landed, what was too thin, what you never reached. Then run it again.",
  },
] as const;

/**
 * The argument for the product, rather than a description of it.
 *
 * Every line here is about the method and can be checked by thinking about it.
 * No competitor is named, and nothing is claimed about outcomes — `design.md`
 * bans invented proof on the landing, and "students score higher" would be
 * exactly that.
 */
const whyOutLoud = [
  {
    title: "Recognising is not knowing",
    body: "You can spot an answer without being able to produce one.",
  },
  {
    title: "Gaps only show when you speak",
    body: "Re-reading finds nothing wrong. The page supplies every step.",
  },
  {
    title: "Marked against your material",
    body: "Points come from your file, not from a topic name.",
  },
] as const;

/**
 * Tick marks at the four corners of a ruled block.
 *
 * Lifted from Watermelon UI's stats template, where they frame a bounded
 * region the way a crop mark frames a plate. On a page built entirely out of
 * hairlines they cost no colour and no motion, and they do the one thing this
 * page needed: say where a block *ends*. Every section here is separated by
 * the same 1px rule at the same weight, so the eye reads a continuous ledger
 * rather than a sequence of chapters, and the fix is not a heavier rule — it
 * is a corner.
 *
 * Only on blocks that are genuinely bounded. A mark at the corner of
 * something that runs off the edge of the screen is a lie about the layout.
 */
function CornerMarks() {
  return (
    <>
      {(
        [
          "-top-[5.5px] -left-[5.5px]",
          "-top-[5.5px] -right-[5.5px]",
          "-bottom-[5.5px] -left-[5.5px]",
          "-bottom-[5.5px] -right-[5.5px]",
        ] as const
      ).map((position) => (
        <span
          aria-hidden="true"
          key={position}
          className={`pointer-events-none absolute size-[11px] text-border ${position}`}
        >
          <span className="-translate-y-1/2 absolute top-1/2 left-0 h-px w-full bg-current" />
          <span className="-translate-x-1/2 absolute top-0 left-1/2 h-full w-px bg-current" />
        </span>
      ))}
    </>
  );
}

/**
 * The page's one inversion, taken as a flight of steps instead of a cut.
 *
 * A Haikei "layered steps" figure, authored to this page's two light stocks
 * rather than exported from the tool with its own palette. Haikei's other
 * fifteen generators are all some form of blob, wave or blurry gradient, and
 * `design.md` bans every one of those by name — a soft radial shape laid over
 * a layout as decoration is the thing this page has removed twice. Steps are
 * the exception because they are made of the same straight rules the whole
 * page is made of.
 *
 * It earns its place at exactly one boundary. The landing gets a single
 * crossing from light to dark and it happens at the close, where going dark
 * means *this is the end*; up to now that crossing was a 1px rule, so the
 * lights went out between one paragraph and the next. Terracing down through
 * both stocks makes it an arrival. Anywhere else on the page the same figure
 * would be a smudge, which is the test: take it away here and the close stops
 * reading as a close, take it away anywhere else and nothing is lost.
 */
function SteppedEdge() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 96"
      preserveAspectRatio="none"
      className="absolute inset-x-0 top-0 z-[3] h-[clamp(2.5rem,5vw,6rem)] w-full"
    >
      {/* Painted back to front: the deeper stock is the lower flight, so the
          lighter one lands on top of it and each tread shows one stop of the
          ramp. Two treads, three tones counting the night underneath. */}
      <path
        d="M0,0 H1440 V36 H1200 V48 H960 V60 H720 V72 H480 V84 H240 V96 H0 Z"
        fill="var(--background)"
      />
      <path
        d="M0,0 H1440 V12 H1200 V24 H960 V36 H720 V48 H480 V60 H240 V72 H0 Z"
        fill="var(--card)"
      />
    </svg>
  );
}

/** Where the partner mark points. The `ref` is how YRI attribute the referral. */
const YRI_URL = "https://yriscience.com?ref=EXPLAINALOUD";

/**
 * The lion's own gold, sampled from the artwork rather than picked.
 *
 * Written here and used once. It is not a page colour and must not become
 * one — `design.md` allows exactly four (three verdicts and the streak flame)
 * beyond the register's accent, and this is none of them. It is the partner's
 * identity, appearing inside the partner's block and nowhere else.
 */
const YRI_GOLD = "#eccc65";

const ease = [0.23, 1, 0.32, 1] as const;
/**
 * The read-through waveform.
 *
 * Written out rather than generated, for two reasons. It has to be byte
 * identical between the dim layer and the lit one or the recorded bars will
 * not line up with the unrecorded ones, and it has to be identical between
 * the server render and the client one, which rules out anything random.
 *
 * The shape is speech shaped on purpose: runs of loud syllables, short dips
 * where somebody breathes, one long quiet stretch about two thirds through.
 * A uniformly noisy bar chart reads as a decoration; this reads as a person
 * talking.
 */
const READ_WAVE = [
  22, 38, 30, 52, 44, 66, 48, 34, 26, 40, 58, 72, 60, 46, 32, 24, 36, 54, 68,
  80, 62, 44, 30, 22, 34, 50, 64, 76, 88, 70, 52, 38, 28, 20, 30, 46, 60, 74,
  56, 42, 26, 18, 28, 44, 58, 70, 84, 66, 48, 34, 24, 32, 46, 62, 78, 90, 72,
  54, 40, 28, 20, 26, 38, 52, 66, 58, 44, 30, 22, 16, 24, 36, 48, 62, 74, 56,
  40, 26, 18, 22, 34, 50, 64, 80, 68, 50, 36, 24, 16, 20, 30, 44, 58, 72, 60,
  46, 32, 22, 28, 42, 56, 70, 84, 66, 48, 32, 20, 26, 38, 54, 68, 60, 44, 30,
  20, 24, 36, 50, 64, 76, 58, 42, 28, 18, 22, 32, 46, 60, 52, 38, 26, 20,
] as const;

/**
 * The hero's product panel: what the app does, marked the way the app marks.
 *
 * Three versions of this have now been thrown away, and the reasons are worth
 * keeping because each one was a different mistake.
 *
 * It began as an app window — a mic button with a pulsing ring, a twelve-bar
 * waveform, a running clock and three checklist rows. That is a picture of *a
 * recorder*, which is the least interesting true thing about this product, and
 * it carried every tell: chrome around content, a fake timestamp, an icon in a
 * circle, decoration that moves forever while explaining nothing.
 *
 * What replaced it was a sentence that typed itself into a paragraph, with the
 * words not yet said sitting there greyed out and the whole line riding a sine
 * curve. That was worse in a way that only shows up on screen. Ghosted text
 * means two weights and two colours on the same line with a ragged edge down
 * the middle of it; the curve means no two words share a baseline; and a
 * paragraph that fills up, stops, holds and empties is not continuous — it is
 * a thing that keeps starting over in the corner of your eye.
 *
 * So: one line, running. Words arrive at the speed somebody says them and the
 * line slides left to keep up, the way live captions do. Nothing is ever shown
 * before it is said, so there is no grey tail and no ragged edge. Nothing
 * resets, because the stream never ends — it is a loop with no seam in it.
 *
 * And a beat behind the newest word, each claim takes its verdict: green when
 * it is specific enough to check, amber when it was hedged, red where a step
 * was skipped. The same three colours the grader uses inside the app, because
 * the green somebody is shown before signing up has to be the green they are
 * graded in afterwards.
 *
 * The sentences are facts about the product. That is deliberate too — the page
 * marks its own claims, which is the only demonstration available to a landing
 * page that is forbidden from inventing proof.
 */

/* `useLayoutEffect` is the right hook — the offset must be written before the
   browser paints or the line is briefly in last word's position — but React
   logs a warning for it on the server, where it does nothing at all. This is
   the standard shim, and it is correct here because the first server render
   has no words in it to measure. */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** A claim's verdict, or `null` for the connective tissue between claims. */
type Verdict = "ok" | "vague" | "miss" | null;

/**
 * The stream, in the order it is spoken. It loops, so the last line has to run
 * into the first without a join you can hear.
 *
 * Split by claim rather than by word, so a verdict covers the span it belongs
 * to; the words inside are what arrive one at a time.
 */
const SPOKEN: Array<{ text: string; verdict: Verdict }> = [
  { text: "So the idea is you give it whatever you are", verdict: null },
  { text: "meant to know by Thursday,", verdict: "ok" },
  { text: "a chapter, a deck, a paper you have", verdict: null },
  { text: "not read closely enough,", verdict: "ok" },
  { text: "and it reads the whole thing and works out", verdict: null },
  { text: "the points you would be expected to hit.", verdict: "ok" },
  { text: "Then you talk.", verdict: null },
  { text: "Three minutes,", verdict: "ok" },
  { text: "nothing in front of you,", verdict: "ok" },
  { text: "no script to fall back on.", verdict: null },
  { text: "And while you are still talking, it marks you.", verdict: null },
  { text: "The claims solid enough to check", verdict: null },
  { text: "turn green.", verdict: "ok" },
  { text: "The ones you", verdict: null },
  { text: "sort of, kind of", verdict: "vague" },
  { text: "got to", verdict: null },
  { text: "turn amber.", verdict: "vague" },
  { text: "And the step you skipped straight past", verdict: null },
  { text: "never turns up at all,", verdict: "miss" },
  { text: "because you never said it.", verdict: null },
  { text: "What you get at the end is not a score out of ten.", verdict: null },
  { text: "It is a list of the things", verdict: null },
  { text: "you did not say.", verdict: "miss" },
  { text: "Which is the only part worth knowing.", verdict: "ok" },
  { text: "So you read it, and you go again,", verdict: null },
  { text: "and this time you say them.", verdict: null },
];

/**
 * Between words, and this is a speaking pace rather than an animation duration.
 *
 * It was 190ms, which is 315 words a minute. Nobody talks at 315 words a
 * minute — an unhurried explanation runs about 150 and a brisk one about 180,
 * which is the range the product measures people in and shows back to them.
 * At 190 the line was not somebody explaining something, it was a ticker, and
 * a reader could not finish a clause before it had gone.
 *
 * 340ms is 176 words a minute: the top of the ordinary range, because this
 * still has to hold a landing page rather than lull it.
 */
const WORD_MS = 340;

/**
 * How long the line takes to travel one word, and deliberately longer than the
 * gap between words.
 *
 * Set equal to `WORD_MS` each transition finished exactly as the next began,
 * so the line moved in discrete hops of one word — and because words are not
 * the same width, each hop ran at a different speed. Fast, slow, fast, stop.
 * That is the choppiness.
 *
 * Overlapping them fixes it, and CSS is what makes it free: a transition
 * retargeted mid-flight continues from where it actually is rather than
 * restarting, so these average out into one steady drift at about the speed of
 * speech. The line sits a word or so behind its mark, which nobody can see, and
 * moves evenly, which everybody can.
 *
 * The multiple came down from 2.1 with the slower word rate. The distance per
 * hop is unchanged — one word — so a longer gap between words already means a
 * lower velocity, and keeping the old overlap on top of that would leave the
 * line trailing two full words behind the one being said.
 */
const GLIDE_MS = Math.round(WORD_MS * 1.7);

/**
 * How far behind the newest word a verdict lands, counted in words.
 *
 * A timer per word would do the same job and would drift: fifteen timers all
 * started at once, each firing into React state, is fifteen chances for the
 * colours to arrive out of order after a tab has been backgrounded. Counting
 * words instead makes the delay a property of the stream — it cannot desync
 * from the thing it is trailing, because it *is* the thing it is trailing,
 * minus two.
 */
const RESOLVE_LAG = 2;

/**
 * How many words stay in the DOM behind the read edge.
 *
 * Anything further left has been clipped for several seconds. The window
 * slides rather than growing, so an hour on this page costs the same as a
 * minute — and dropping from the front is free precisely because the offset
 * below is measured from `scrollWidth` on every commit: the track gets
 * narrower by exactly the width that came off it, the offset shrinks to match,
 * and nothing on screen moves.
 */
const WINDOW = 26;

/** The verdict tokens sized for running text. See `globals.css` for why. */
const VERDICT_INK: Record<Exclude<Verdict, null>, string> = {
  ok: "var(--ok-spoken)",
  vague: "var(--vague-spoken)",
  miss: "var(--miss-spoken)",
};

const LEGEND: Array<{ verdict: Exclude<Verdict, null>; label: string }> = [
  { verdict: "ok", label: "Checkable" },
  { verdict: "vague", label: "Hedged" },
  { verdict: "miss", label: "Skipped" },
];

/** Every word of the loop, flattened once, each remembering its claim. */
const WORDS = SPOKEN.flatMap((part, partIndex) =>
  part.text
    .split(" ")
    .map((word) => ({ word, verdict: part.verdict, partIndex })),
);

function SpokenLine() {
  const reduceMotion = useReducedMotion();
  const track = useRef<HTMLParagraphElement>(null);
  const viewport = useRef<HTMLDivElement>(null);

  /* One counter, and everything on screen is a function of it. It only ever
     goes up — the modulo happens where the words are read, so the stream has
     no wrap-around to render and therefore no seam.
     *
     * It starts at a full line rather than at zero, for two reasons. The first
     * is that the hero's first painted frame should not contain a hole where a
     * sentence is going to be; watching it type itself in from nothing is a
     * worse arrival than finding it already talking. The second is a failure
     * mode: the interval below refuses to run while the document reports
     * itself hidden, and any context that reports hidden while still painting
     * — an embedded webview, a preview pane — would otherwise get a blank
     * strip forever. Starting full means the worst case is a line that does
     * not move, rather than a line that is not there. */
  const [spoken, setSpoken] = useState(WINDOW);
  /* Two numbers rather than one, and the split is the whole trick — see the
     layout effect below for what went wrong with a single offset. */
  const [glide, setGlide] = useState(0);
  const [shift, setShift] = useState(0);
  /* Widths of the words currently on screen, plus running totals for every word
     that has ever been said and every word that has since been dropped. Refs,
     not state: they are the arithmetic behind the two numbers above, and
     re-rendering when they change would be re-rendering twice for one word. */
  const widths = useRef(new Map<number, number>());
  const saidWidth = useRef(0);
  const goneWidth = useRef(0);
  /** Set by the resize observer, cleared by the layout effect that acts on it. */
  const rebase = useRef(false);
  const [resized, setResized] = useState(0);

  /* Stopped while the tab is in the background, and this is not a nicety.
   *
   * A hidden tab suspends rendering but keeps firing timers, so the words
   * would go on being added — hundreds of them over a lunch break — while the
   * transition that carries the line to meet them never advances a frame. The
   * two come back in sync the moment the tab is looked at again, which is a
   * page opening on a sentence sprinting backwards out of shot. Measured at
   * two thousand pixels adrift after a couple of minutes behind another
   * window. */
  useEffect(() => {
    if (reduceMotion) return;
    let id = 0;

    const start = () => {
      if (id) return;
      id = window.setInterval(() => setSpoken((n) => n + 1), WORD_MS);
    };
    const stop = () => {
      window.clearInterval(id);
      id = 0;
    };
    const sync = () => (document.hidden ? stop() : start());

    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [reduceMotion]);

  /* The sliding window, oldest first. `spoken` counts words said since the page
     opened and keeps counting past the end of the loop; the modulo here is what
     makes it a loop, and doing it per word rather than per pass is why there is
     no moment where the line is empty. */
  const visible = useMemo(() => {
    const from = Math.max(0, spoken - WINDOW);
    const out: Array<{ key: number; word: string; verdict: Verdict }> = [];
    for (let i = from; i < spoken; i++) {
      const source = WORDS[i % WORDS.length];
      out.push({
        key: i,
        word: source.word,
        // A verdict lands a couple of words after the claim has moved on.
        verdict: i <= spoken - 1 - RESOLVE_LAG ? source.verdict : null,
      });
    }
    return out;
  }, [spoken]);

  /* Reduced motion gets the same sentence, standing still and fully marked.
     Not a second component: the same words, the same colours, no interval. */
  const still = useMemo(
    () =>
      WORDS.slice(0, 14).map((source, index) => ({
        key: index,
        word: source.word,
        verdict: source.verdict,
      })),
    [],
  );
  const shown = reduceMotion ? still : visible;

  /* A rotation, a window drag, a devtools panel opening: all of them change the
     box and the type size together. Nothing is recomputed here — the flag is
     read by the layout effect below, which is the only place that owns the
     numbers. */
  useEffect(() => {
    const box = viewport.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      rebase.current = true;
      setResized((n) => n + 1);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  /* Measured after layout and before paint, so the line has never been seen in
     the wrong place. The read edge is the right-hand side of the viewport less
     a gutter: words fill leftwards from there, which is where the eye already
     is, and older ones slide out under the fade on the left.
     *
     * **Why two transforms.** The obvious version measures `scrollWidth` and
     * transitions one transform to `readEdge - scrollWidth`, and it works right
     * up until the window fills. After that, every tick both appends a word on
     * the right and removes one on the left — and removing it shifts the whole
     * line left *instantly*, by that word's width, because the track is
     * anchored on its left edge. A single transform has to undo that jump and
     * perform the glide at the same time, over the same 190ms, and the two
     * mostly cancel: the line stops moving and the words start stepping.
     *
     * So the jump and the glide are separated. The outer element carries the
     * total width of everything dropped and is never transitioned, which
     * cancels the removal in the same frame it happens. The inner one carries
     * the total width of everything ever said, only ever grows, and is the only
     * thing that animates. What is left is one number sliding in one direction
     * for as long as the page is open. */
  useIsomorphicLayoutEffect(() => {
    const row = track.current;
    const box = viewport.current;
    if (!row || !box) return;

    const spans = row.children;
    const oldest = shown.length > 0 ? shown[0].key : 0;

    /* Everything measured so far is void once the box changes size, because the
       type is set in `vw` and every cached width is from the old size. Summed
       against the new layout they put the line hundreds of pixels out — on a
       phone the whole strip left the screen and never came back, which is how
       this was found. Rebasing throws the running totals away and starts again
       from what is on screen right now. */
    if (rebase.current) {
      rebase.current = false;
      widths.current.clear();
      saidWidth.current = 0;
      goneWidth.current = 0;
    }

    for (let i = 0; i < shown.length; i++) {
      const key = shown[i].key;
      if (widths.current.has(key)) continue;
      // The fractional width, not `offsetWidth`: these are summed over
      // thousands of words, and half a pixel of rounding per word is a line
      // that has drifted a word and a half off its mark inside two minutes.
      const width = (spans[i] as HTMLElement).getBoundingClientRect().width;
      widths.current.set(key, width);
      saidWidth.current += width;
    }
    for (const [key, width] of widths.current) {
      if (key >= oldest) continue;
      goneWidth.current += width;
      widths.current.delete(key);
    }

    const readEdge = box.clientWidth - 24;
    setGlide(Math.max(0, saidWidth.current - readEdge));
    setShift(goneWidth.current);
    // `resized` is a dependency for its side effect on `rebase`, not its value.
  }, [shown, resized]);

  return (
    <section
      aria-label="What Explainaloud does, marked the way it marks you"
      className="w-full"
    >
      {/* Fixed to one line and one height. A strip that grows and shrinks with
          its content is a strip that shoves the buttons under it around, and
          the reason the last version looked broken was that its right edge was
          a different length every second. */}
      <div
        ref={viewport}
        className="relative overflow-hidden"
        style={{
          /* Faded at both ends rather than cut. Words are mid-sentence when
             they leave, and a hard edge chops a letter in half. */
          maskImage:
            "linear-gradient(to right, transparent, black 8%, black 94%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 8%, black 94%, transparent)",
        }}
      >
        {/* A plain `p` with a CSS transition, deliberately, and this is the
            second time this component has been rewritten for the same reason.
            framer owns the `style` attribute of a `motion` element, and an
            `animate` target recomputed from a ref measurement taken in a layout
            effect never reached the DOM — the line sat at `translateX(0)` while
            every word after the eighth ran off the right-hand edge.

            A transition is also the better tool here. The value changes once
            per word, always in the same direction, always by an amount decided
            before the frame is drawn: that is a predetermined animation, so it
            belongs on the compositor rather than in a `requestAnimationFrame`
            loop competing with the WebGL field behind it. */}
        {/* The instant half. Never transitioned, on purpose. */}
        <div
          style={{ transform: `translate3d(${shift}px, 0, 0)` }}
          className="will-change-transform"
        >
          <p
            ref={track}
            /* The animated half. Linear, and longer than one word, so the
               transitions overlap into one steady drift rather than a row of
               discrete hops at varying speeds. See `GLIDE_MS`. */
            style={{
              transform: `translate3d(${-glide}px, 0, 0)`,
              transition: reduceMotion
                ? undefined
                : `transform ${GLIDE_MS}ms linear`,
            }}
            className="whitespace-nowrap py-1 font-display text-[clamp(1.05rem,2.3vw,1.6rem)] text-primary-foreground leading-[1.6] tracking-[-0.02em] will-change-transform"
          >
            {shown.map(({ key, word, verdict }) => (
              <span
                key={key}
                /* The arrival is a keyframe in `globals.css` and the colour is a
                   transition on this class, and both are CSS rather than JS for
                   the same reason: there are thirty of these on screen at once,
                   over a canvas that is already using the GPU. */
                style={verdict ? { color: VERDICT_INK[verdict] } : undefined}
                className="lp-said inline-block whitespace-pre transition-colors duration-500"
              >
                {word}{" "}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* What the three colours mean, said once. The stream demonstrates them;
          this names them, which is the part a moving line cannot do. */}
      <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-white/12 border-t pt-5 font-mono text-[0.66rem] uppercase tracking-[0.14em]">
        {LEGEND.map((entry) => (
          <li key={entry.verdict} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ background: VERDICT_INK[entry.verdict] }}
            />
            <span className="text-primary-foreground/70">{entry.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* The floating chat bubble lived here. It was a fixed circle in the corner
 * that opened a card asking "what do you need to say clearly today?" — which
 * is the single most generic thing on the internet, answers nothing, and was
 * the first item a reviewer pointed at. The page has a working demo now; a
 * pretend one in the corner only competes with it. */

const STAGE_MS = 2200;

/**
 * The three verdicts, cycling on their own.
 *
 * This used to be a 220vh scroll-jacked section: a `position: sticky` panel
 * whose state was driven by `scrollYProgress`, so the only way to see the
 * second and third verdicts was to keep scrolling — and the two extra
 * viewports of height that bought the scrub read, correctly, as a screen and a
 * half of blank page under the panel.
 *
 * The content was never scroll-shaped to begin with. It is three variations of
 * one idea, which is a loop, so it loops: the section is now its own height and
 * the stage advances on a timer, paused while it is off screen so a visitor
 * does not arrive mid-sentence.
 */
function ResultsCarousel() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [running, setRunning] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setRunning(entry.isIntersecting),
      { threshold: 0.35 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!running || reduceMotion) return;
    const interval = window.setInterval(() => {
      setActiveStage((current) => (current + 1) % 3);
    }, STAGE_MS);
    return () => window.clearInterval(interval);
  }, [running, reduceMotion]);

  const stages = [
    {
      label: "Reached",
      eyebrow: "Hit · the point",
      quote: "The forces act on different objects, so they do not cancel.",
      note: "Clear, specific, matched to your point.",
      detail: "Checked off the moment your meaning lands.",
      color: "var(--ok)",
      surface: "bg-[var(--panel-deep)]",
    },
    {
      label: "Too thin",
      eyebrow: "Rushed · needs support",
      quote: "The launch went pretty well overall.",
      note: "You touched it, but gave no evidence.",
      detail: "Said, but too thinly to count.",
      color: "var(--vague)",
      surface: "bg-[var(--panel-deep)]",
    },
    {
      label: "Missed",
      eyebrow: "Missed · next rehearsal cue",
      quote: "Explain how the customer handoff will work.",
      note: "Never appeared in your rehearsal.",
      detail: "A precise prompt for your next run.",
      color: "var(--miss)",
      surface: "bg-[var(--panel-deep)]",
    },
  ] as const;
  const stage = stages[activeStage];

  return (
    <section
      id="results"
      ref={sectionRef}
      className="relative border-border border-y bg-background px-5 py-24 md:px-8 md:py-28"
    >
      <div
        data-scroll-reveal
        className="relative mx-auto grid w-full max-w-[72rem] gap-8 lg:grid-cols-[9rem_minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center lg:gap-10"
      >
        <div className="hidden lg:block">
          {stages.map((item, index) => {
            const isActive = index === activeStage;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveStage(index)}
                aria-current={isActive}
                className={`relative block w-full border-l-2 py-3 pl-5 text-left font-mono text-xs uppercase tracking-[0.14em] transition-colors ${
                  isActive
                    ? "border-[var(--stage-color)] text-strong"
                    : "border-border text-muted-foreground/55 hover:text-muted-foreground"
                }`}
                style={{ "--stage-color": item.color } as CSSProperties}
              >
                {item.label}
                {/* The bar is the section's only clock. Without it the panel
                    looks like it changes at random, which is the difference
                    between a demo and a glitch. */}
                {isActive && !reduceMotion && (
                  <motion.span
                    key={`${item.label}-${activeStage}`}
                    aria-hidden="true"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: STAGE_MS / 1000, ease: "linear" }}
                    className="-left-[2px] absolute inset-y-0 w-[2px] origin-top"
                    style={{ backgroundColor: item.color }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="relative overflow-hidden rounded-[1.1rem] border border-border bg-card p-4 md:p-6">
          <div className="flex items-center justify-between font-mono text-[0.62rem] text-muted-foreground uppercase tracking-[0.12em]">
            <span>Live rehearsal · 01:42</span>
            <span>{activeStage + 1} / 3</span>
          </div>
          {/* All three stages are laid into the same grid cell, so the panel
              is always as tall as the longest of them and nothing moves when
              one swaps for another. A `min-h` grew with whichever quote was
              showing, which resized the page under the reader — and a fixed
              height would only be that same bug with a magic number in front
              of it, waiting for the next copy edit. */}
          <div
            className={`mt-5 grid rounded-none border-white/10 border-y border-r border-l-2 p-7 text-card-foreground transition-colors duration-500 md:p-9 ${stage.surface}`}
            style={{ borderLeftColor: stage.color }}
          >
            {stages.map((item, index) => {
              const isActive = index === activeStage;
              return (
                <motion.div
                  key={item.label}
                  aria-hidden={!isActive}
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    y: isActive || reduceMotion ? 0 : 10,
                  }}
                  transition={{
                    duration: isActive ? 0.26 : 0.14,
                    delay: isActive ? 0.14 : 0,
                    ease,
                  }}
                  className="col-start-1 row-start-1 flex flex-col"
                >
                  <div
                    className="flex items-center gap-3 font-mono text-[0.64rem] uppercase tracking-[0.12em]"
                    style={{ color: item.color }}
                  >
                    <span
                      className="h-2.5 w-2.5"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.eyebrow}
                  </div>
                  <p className="mt-7 font-display text-[clamp(1.35rem,3vw,2.9rem)] text-white leading-[1.08] tracking-[-0.03em]">
                    {item.quote}
                  </p>
                  <p className="mt-auto max-w-[30rem] pt-7 text-primary-foreground/70 leading-relaxed">
                    {item.note}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="lg:pl-2">
          <p
            className="font-mono text-[0.65rem] uppercase tracking-[0.14em] transition-colors duration-500"
            style={{ color: stage.color }}
          >
            Rehearsal, made visible
          </p>
          <h2 className="mt-5 font-display text-[clamp(1.7rem,3.4vw,3.4rem)] text-strong leading-[1.02] tracking-[-0.04em]">
            Your points update as you speak.
          </h2>
          {/* Stacked for the same reason as the panel: these three run to
              different line counts, and on a narrow column that is the
              difference between two lines and four. */}
          <div className="mt-6 grid">
            {stages.map((item, index) => (
              <motion.p
                key={item.label}
                aria-hidden={index !== activeStage}
                initial={false}
                animate={{ opacity: index === activeStage ? 1 : 0 }}
                transition={{
                  duration: index === activeStage ? 0.26 : 0.14,
                  delay: index === activeStage ? 0.14 : 0,
                  ease,
                }}
                className="col-start-1 row-start-1 text-muted-foreground leading-relaxed"
              >
                {item.detail}
              </motion.p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* `FeedbackDemo` lived here, and it was the same section twice. It showed one
 * quoted sentence and three tabbed verdicts; `ResultsCarousel` above it shows
 * one quoted sentence and three cycling verdicts. Two components, one idea,
 * one after the other — which is most of why the page read as padded. The
 * playable console now carries the marked take, so the argument is made once,
 * by the thing the reader can operate. */

export function LandingRedesign() {
  const reduceMotion = useReducedMotion();
  const pageRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navSentinelRef = useRef<HTMLDivElement>(null);
  const flyerRef = useRef<HTMLDivElement>(null);
  const flyerSpinRef = useRef<HTMLDivElement>(null);
  const navSlotRef = useRef<HTMLSpanElement>(null);

  /**
   * The bar turns to glass once it is off the hero.
   *
   * Deliberately not a ScrollTrigger. Whether the wordmark is legible is not a
   * decoration, and everything GSAP does here arrives behind a dynamic import —
   * so on a slow connection the bar would spend the first seconds dark over
   * light stock.
   *
   * It was an IntersectionObserver, and that is what made it fail on a fast
   * flick: the observer only reports when it next samples, and the browser
   * coalesces those samples, so a scroll that crosses the whole hero between
   * two samples can land on white with a navy bar still over it. An observer
   * answers "is it on screen", which is not the question — the question is
   * "where is the seam right now", and that has to be read on the frame it is
   * needed.
   *
   * So: a passive scroll listener, coalesced into one `requestAnimationFrame`
   * so it costs a single rect read per painted frame no matter how many events
   * arrive. It cannot be skipped over, because scrolling and painting are the
   * same loop.
   */
  /**
   * The mark flies to the nav as the first screen scrolls away.
   *
   * Deliberately not a tween. The previous version was a GSAP timeline that
   * animated a `fixed` element toward a landing pad by computing viewport
   * offsets, and when that arithmetic did not land there was nothing to catch
   * it: the mark stayed at full size in the middle of the page for the entire
   * document. A tween is a promise about the future, and it can be broken by a
   * stalled ticker, a refresh that never fires, or a bad number.
   *
   * This reads scroll position and sets a transform, every frame, from
   * scratch. There is no state to get stuck in — whatever the last frame did,
   * this one recomputes the answer from where the page actually is. Scroll to
   * the bottom in one flick and it is simply at the end.
   */
  useEffect(() => {
    const sentinel = navSentinelRef.current;
    const nav = navRef.current;
    if (!sentinel || !nav) return;

    let frame = 0;
    let running = true;
    /* Last scroll position this actually did work for.
       `sync` reads three `getBoundingClientRect`s, and a rect read after any
       style change forces the browser to flush layout. Running that
       unconditionally every frame means the page pays for a forced synchronous
       layout sixty times a second forever, including while the reader is
       sitting perfectly still reading a paragraph.

       Nothing this function computes can change unless the page has scrolled
       or been resized, so when the scroll position is unchanged there is
       nothing to recompute. `-1` because 0 is a real scroll position and would
       otherwise skip the very first frame. */
    let lastY = -1;
    const sync = (force = false) => {
      if (!force && window.scrollY === lastY) return;
      lastY = window.scrollY;
      nav.classList.toggle(
        "is-light",
        sentinel.getBoundingClientRect().top <= 64,
      );

      const flyer = flyerRef.current;
      const spin = flyerSpinRef.current;
      const slot = navSlotRef.current;
      const hero = heroRef.current;
      if (!flyer || !spin || !slot || !hero) return;

      // Below `lg` the flyer is not rendered at all; nothing to place.
      if (flyer.offsetWidth === 0) return;

      const heroRect = hero.getBoundingClientRect();
      const slotRect = slot.getBoundingClientRect();
      const size = flyer.offsetWidth;

      /* The journey is the first screen. It is complete by the time the hero
         has scrolled away, so the mark is already the nav mark before any of
         the light sections arrive — which is what stops it from ever being an
         object floating over a paragraph. */
      const travel = Math.max(1, heroRect.height * 0.72);
      const raw = -heroRect.top / travel;
      const t = raw < 0 ? 0 : raw > 1 ? 1 : raw;
      // ease-in-out, so it leaves and arrives calmly rather than linearly
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

      /* Centred in the right half, on the hero's own centre line.
         Every previous position was a number picked to avoid something: away
         from the headline, out of the bright part of the water, lower so it
         stopped colliding. Avoiding things is why it kept reading as awkward,
         because a mark placed by exclusion is not placed at all, and the eye
         can tell.

         This is placed by the layout instead. The hero is a headline column
         on the left and open water on the right; the centre of that right
         half is a real position in the composition, and sitting on the hero's
         vertical centre line puts it in the same optical row as the headline
         it belongs to. It reads as deliberate because it is. */
      const startX = heroRect.left + heroRect.width * 0.75 - size / 2;
      const startY = heroRect.top + heroRect.height * 0.46 - size / 2;
      const endScale = slotRect.width / size;

      const x = startX + (slotRect.left - startX) * e;
      const y = startY + (slotRect.top - startY) * e;
      const scale = 1 + (endScale - 1) * e;

      flyer.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      flyer.style.opacity = String(0.82 + 0.18 * e);
      spin.style.transform = reduceMotion
        ? "none"
        : `rotateY(${(e * 360).toFixed(2)}deg)`;

      /* The static nav mark only appears once the flyer is on top of it, so
         the two are never both visible and never both absent. */
      slot.style.opacity = e > 0.995 ? "1" : "0";
      flyer.style.visibility = e > 0.995 ? "hidden" : "visible";
    };
    /* A frame loop, not a scroll listener.
       Scroll events are the obvious input here and they are not dependable
       enough for something that positions an object: they are coalesced under
       load, they do not fire at all in some embedded viewers, and anything
       that misses one is left holding a stale transform. Measured in one such
       viewer: `scrollY` reported 900 and zero scroll events had been
       delivered, so both the bar and the mark were reading a position from
       several seconds earlier.

       Reading the page's own geometry once per painted frame cannot miss
       anything, because painting is the thing being kept in step with. The
       body is two `getBoundingClientRect` calls and some arithmetic — cheap
       enough to be the boring, correct answer. */
    const tick = () => {
      if (!running) return;
      sync();
      frame = requestAnimationFrame(tick);
    };
    tick();

    /* And scroll events on top of the loop, which is belt and braces on
       purpose. Each input fails in a way the other survives: scroll events are
       coalesced under load and are not delivered at all in some embedded
       viewers, while `requestAnimationFrame` stops when the page is not being
       painted. Measured in one such viewer: one animation frame in five
       hundred milliseconds, and zero scroll events, while `scrollY` moved 700
       pixels. Either input alone leaves a stale transform on screen there;
       together, something has to have gone wrong twice. `sync` recomputes from
       scratch, so running it more often than necessary costs two rect reads
       and changes nothing. */
    /* These three can change the answer without the scroll position moving,
       so they bypass the guard above. */
    const forceSync = () => sync(true);
    window.addEventListener("scroll", forceSync, { passive: true });
    window.addEventListener("resize", forceSync);
    document.addEventListener("visibilitychange", forceSync);

    return () => {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", forceSync);
      window.removeEventListener("resize", forceSync);
      document.removeEventListener("visibilitychange", forceSync);
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (!heroRef.current || !pageRef.current) return;

    let gsapContext: { revert: () => void } | undefined;
    let cancelled = false;
    const docCleanups: Array<() => void> = [];
    const hoverCleanups: Array<() => void> = [];
    const generatedNodes: HTMLElement[] = [];

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled || !heroRef.current || !pageRef.current) return;
        gsap.registerPlugin(ScrollTrigger);
        gsapContext = gsap.context(() => {
          /* The intro is a `from()`: it hides the headline and animates it
             back. That is a promise the page has to keep, and it was not
             keeping it. GSAP's ticker stalls while the tab is hidden, so a
             landing opened in a background tab froze part-way through and the
             words stayed put. Measured mid-freeze, down the six words: 0.82,
             0.73, 0.60, 0.43, 0.21, 0 — the last two lines of the headline
             simply were not there.

             The photograph hid this for months, because a faint headline over
             a dark photo still looks like a dark photo. It only became obvious
             once the backdrop got brighter.

             So the animation is now something the page can afford to lose: if
             nobody is looking it is skipped, and if they look away part-way it
             snaps to the end. The words always exist. */
          /* Every reveal on this page is a `from()`: it hides the element
             and animates it back. That is a debt, and GSAP's ticker stalls
             while the tab is hidden — so a tween that started and did not
             finish leaves its content part-way, for good. Measured on the
             product window after a background load: opacity 0.2018, transform
             still mid-flight. The headline had the same failure and was fixed
             in isolation; this is the same bug three more times, so it is
             worth one mechanism rather than four patches.

             Anything that hides content goes in here, and if nobody is
             watching, it is snapped to its end state. */
          const reveals: Array<{ progress: (value: number) => unknown }> = [];
          const settleReveals = () => {
            if (!document.hidden) return;
            for (const reveal of reveals) reveal.progress(1);
          };

          const intro = gsap.timeline({
            onComplete: () =>
              gsap.set("[data-hero-word], [data-hero-secondary]", {
                clearProps: "transform,opacity",
              }),
          });
          reveals.push(intro);
          const settleIntro = () => {
            settleReveals();
          };
          document.addEventListener("visibilitychange", settleIntro);
          docCleanups.push(() =>
            document.removeEventListener("visibilitychange", settleIntro),
          );

          intro
            /* No rotation. Each word used to come in tilted four degrees and
               straighten as it landed, and a line of type that arrives crooked
               reads as loose no matter how well it settles. Straight up from
               behind the mask, tighter stagger, one ease. */
            .from("[data-hero-word]", {
              yPercent: 118,
              opacity: 0,
              duration: 0.72,
              stagger: 0.055,
              ease: "power4.out",
            })
            .from(
              "[data-hero-secondary]",
              {
                y: 24,
                opacity: 0,
                duration: 0.6,
                stagger: 0.09,
                ease: "power4.out",
              },
              "-=0.34",
            )
            /* The verdicts, last. They have to arrive after the words have
               settled, because a rule drawn under a word that is still moving
               reads as part of the word's animation rather than as a judgement
               made about it. The gap between the two marks is deliberate: the
               green lands, you read it, and then the red one contradicts it. */
            .fromTo(
              "[data-hero-mark]",
              { backgroundSize: "0% 0.055em" },
              {
                backgroundSize: "100% 0.055em",
                duration: 0.72,
                stagger: 0.34,
                ease: "power2.inOut",
              },
              "-=0.1",
            );

          // After the chain, never before it: the guard has to have tweens to
          // fast-forward, and an empty timeline reports itself complete.
          settleIntro();

          if (!reduceMotion) {
            /* A `background-position` parallax on the hero lived here, and it
               had to go for two reasons.

               `background-position` applies to every layer in the shorthand.
               The hero used to be one layer — a photograph — and is now two,
               because the scrim sits in front of it. So the tween was dragging
               the darkening across the page independently of anything it was
               darkening, which is the "weird movement" this fixes.

               And it was scrubbed at 1.2, meaning the picture lagged over a
               second behind the scroll and then kept coasting after it stopped,
               in both directions. Even on one layer that reads as the page
               being broken rather than as depth.

               Parallax on a photograph is doable, but it has to be a
               transformed layer the compositor can move on the GPU, not a
               background-position the browser repaints every frame. Worth
               doing deliberately or not at all. */
          }

          /* The nav items used to slide in from 42px left on load. Removed:
             it is a fifth entrance on a page that already has one, and the
             navigation arriving late is the navigation being unavailable
             late. */

          /* The tween that flew the mark into the nav lived here and is gone.
             It positioned a `fixed` element by computing offsets from the
             viewport centre to a hidden landing pad in the bar — and when that
             arithmetic did not land, the mark did not fall back to anything.
             It simply stayed put: 128px of translucent glass parked over the
             page, drifting across the rehearsal panel, the transcript and the
             guidance column as the reader scrolled. Measured at six scroll
             positions from 0 to past the product window, it never moved and
             never shrank.

             The mark is now `absolute` inside the hero, which already clips
             its overflow, so it cannot reach the sections below whatever any
             animation does or fails to do. The nav carries its own mark, which
             is what the flight was for. */

          /* `toggleActions`, not `once`.
             `once: true` fires a reveal a single time and then throws the
             trigger away, so scrolling back up and down again shows content
             that has already arrived — the page is finished with you after one
             pass. "play none none reverse" runs it on the way down and rewinds
             it on the way back up, so the second descent looks like the first.

             They stay in the hidden-tab register. It is tempting to argue a
             reversible trigger repairs itself the next time it is crossed, but
             that is wrong: while the tab is hidden the ticker is stalled, so
             the trigger fires and the tween never advances. There is no "next
             time" until somebody is already looking at a half-drawn page.
             Measured that way, the product window sat at 0.19. */
          /* Sections deal themselves out, rather than sliding in as a slab.
             Moving a whole block by 22px is the most common reveal there is
             and it is invisible as craft: the reader sees a rectangle shift.
             Animating the block's own children in sequence is a different
             thing entirely — the eyebrow lands, then the headline, then the
             paragraph, which is the order somebody reads them in anyway. The
             motion follows the reading rather than decorating the container.

             `childNodes` filtered to elements, one level deep only: going
             deeper animates text inside cards that have their own reveal and
             the two fight over the same transform. */
          /* Turned down, deliberately, and the three changes are each a
             different kind of noise removed.
             *
             * **It no longer reverses.** `play none none reverse` re-hid every
             * section on the way back up, so scrolling a page twice meant
             * watching it assemble twice, and a reader who scrolls up to
             * re-read a sentence had it taken away as they arrived. Content
             * that has been read stays put.
             *
             * **It no longer staggers the children.** A heading, a rule and a
             * paragraph arriving 90ms apart is three events where the reader
             * perceives one, and across six sections it is the difference
             * between a page that settles and a page that is always still
             * arriving.
             *
             * **It travels a third as far, in two thirds the time.** 26px over
             * 720ms is a movement you watch; 10px over 420ms is one you only
             * notice if it is missing, which is what a reveal is for. */
          gsap.utils
            .toArray<HTMLElement>("[data-scroll-reveal]")
            .forEach((element) => {
              reveals.push(
                gsap.from(element, {
                  y: 10,
                  opacity: 0,
                  duration: 0.42,
                  ease: "power2.out",
                  scrollTrigger: {
                    trigger: element,
                    start: "top 88%",
                    toggleActions: "play none none none",
                  },
                }),
              );
            });

          /* The blur-to-focus heading reveal lived here, and it is the
             clearest example of what this page had too much of. It set
             `filter: blur(11px)` on every argument heading and resolved it on
             scroll — a full repaint per frame, on the largest type on the
             page, saying nothing that the words did not already say. It read
             as polish applied to a page rather than as anything about this
             product. The verdict sweep below does the same trick where it
             actually means something, and one of those is a signature while
             two is a mannerism. */

          /* The console opens rather than appears: it comes in from below and
             seats itself. This is the one thing on the page a reader is meant
             to reach for, and it should feel like a piece of equipment being
             set down in front of them.
             *
             * **This one is kept at full strength on purpose.** Everything
             * else on the page was turned down; this was not. A reveal earns
             * its distance when it is pointing at the thing the page is
             * about, and one deliberate arrival among quiet ones reads as
             * emphasis — where six of them read as a template. */
          reveals.push(
            gsap.from(".lp-product-window", {
              y: 40,
              opacity: 0,
              duration: 0.66,
              /* Was `back.out(1.15)` with a scale, so the console arrived
                 slightly small and sprang to size. `design.md` bans overshoot,
                 and a scale on this element in particular re-rasterises a
                 window full of small type mid-flight. It rises and fades. */
              ease: "power2.out",
              scrollTrigger: {
                trigger: ".lp-product-window",
                start: "top 88%",
                toggleActions: "play none none reverse",
              },
            }),
          );

          gsap.utils
            .toArray<HTMLElement>("[data-feature-card]")
            .forEach((element) => {
              /* A rise and a fade, and nothing else.
               *
               * This used to overshoot: the card arrived *slightly large*
               * and relaxed to size, on `back.out(1.1)`. `design.md` bans
               * spring and overshoot easing outright and it was right to —
               * an interface element that bounces is an interface element
               * behaving like a toy, and this is a study tool somebody opens
               * the night before a talk. The scale is gone with it: a card
               * that changes size while arriving is a card whose type
               * changes size while arriving.
               *
               * No horizontal component anywhere: the marks and the waveform
               * already own left-to-right. */
              reveals.push(
                gsap.fromTo(
                  element,
                  { y: 10, opacity: 0 },
                  {
                    y: 0,
                    opacity: 1,
                    duration: 0.42,
                    /* The per-card delay is gone with the stagger above. Three
                       cards in a row arriving 80ms apart is a wave, and a wave
                       is the reader watching the layout instead of reading
                       it. */
                    ease: "power2.out",
                    scrollTrigger: {
                      trigger: element,
                      start: "top 88%",
                      toggleActions: "play none none none",
                    },
                  },
                ),
              );
            });

          /* The cursor halo, orb and particle trail lived here.
             `design.md` bans cursor-following effects by name, and this was
             three of them stacked: a lagging ring, a faster dot, and a
             particle spawned every 70ms for as long as the pointer moved.
             They also fought the thing the page is actually about — a
             transcript being marked — by putting the liveliest motion on
             screen somewhere the reader is not looking. */

          gsap.utils
            .toArray<HTMLElement>("[data-gsap-hover]")
            .forEach((element) => {
              const enter = () =>
                gsap.to(element, {
                  scale: 1.03,
                  duration: 0.24,
                  ease: "power3.out",
                });
              const leave = () =>
                gsap.to(element, {
                  scale: 1,
                  duration: 0.3,
                  ease: "power3.out",
                });
              element.addEventListener("mouseenter", enter);
              element.addEventListener("mouseleave", leave);
              hoverCleanups.push(() => {
                element.removeEventListener("mouseenter", enter);
                element.removeEventListener("mouseleave", leave);
              });
            });

          /* Magnetic buttons lived here: every button and hover target drifted
             toward the pointer and sprang back on elastic easing. Banned by
             name in `design.md`, alongside the cursor trail above and the 3D
             tilt below — all three are the same idea, which is decorating the
             pointer instead of the page. */

          /* 3D tilt on hover lived here — the last of the three pointer
             effects. Removed for the same reason as the other two:
             `design.md` bans it, and a panel that rotates under the mouse
             makes a marked transcript harder to read, which is the one
             thing on this page that has to stay readable. */
          /* Read-through. A scrub, not a tween with a duration: the bar is a
             readout of scroll position, so it has to be *derived* from it
             rather than chasing it. `scrub: true` with no number means it is
             on the frame, with no lag to accumulate. */
          /* The take being laid down. A clip rather than a scale, because
             scaling the lit layer would stretch its bars and they would stop
             sitting on top of the dim ones underneath. `scrub: true` with no
             number keeps it on the frame, so it is a readout of scroll
             position rather than something chasing it. */
          gsap.fromTo(
            "[data-read-through]",
            { clipPath: "inset(0% 100% 0% 0%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              ease: "none",
              scrollTrigger: {
                trigger: pageRef.current,
                start: "top top",
                end: "bottom bottom",
                scrub: true,
              },
            },
          );

          /* The head rides the same boundary. Driven by its own tween off the
             same trigger rather than by parenting it to the clipped layer,
             because a child of a clipped element is clipped too and the head
             would be sliced in half by the very edge it is marking.

             `xPercent` so it is a transform on a composited layer, and `left`
             in percent so the travel is the full width at any viewport. */
          gsap.fromTo(
            "[data-read-head]",
            { left: "0%" },
            {
              left: "100%",
              ease: "none",
              scrollTrigger: {
                trigger: pageRef.current,
                start: "top top",
                end: "bottom bottom",
                scrub: true,
              },
            },
          );

          /* Character-by-character scrubbed resolve on the argument
             headlines lived here: every letter split into its own span,
             carrying blur, a lift and a horizontal squash, scrubbed against
             scroll position.

             It was the most expensive thing on the page and the second
             character-level effect in the same scroll — the verdict sweep is
             the first, and that one is the product's own gesture rather than a
             texture. Removing it is most of the reduction: dozens of spans per
             heading, a repaint per frame while any of them was on screen, and
             a headline that could not be read until the reader had scrolled
             far enough to finish assembling it. A headline should be legible
             the moment it is on screen.

          /* The page's own claims get judged, in colour, one word at a time.
             This was a rule drawn under the phrase — the literal gesture a
             grader makes on paper. It was the right idea and the wrong object:
             a coloured underline appearing beneath a headline is the single
             most common "look, emphasis" device on the internet, it fought the
             baseline at every size, and it said nothing a reader could learn
             from. It also had to be fixed twice for colliding with the line
             below it, which is usually the sign that a thing does not want to
             be there.

             What replaces it is the judgement itself, arriving through the
             words: each character takes the verdict colour in turn, left to
             right, at reading speed. The phrase changes state in front of you
             rather than acquiring a decoration, which is much closer to what
             the product actually does — and because the colour lands *on* the
             words, the reader learns the association without a legend. By the
             time green, amber and red appear in the demo they already mean
             something.

             Colour is never the only carrier: the weight goes up with it, so
             the emphasis survives greyscale and colour blindness, and every
             marked phrase is announced to assistive tech by the label below. */
          gsap.utils.toArray<HTMLElement>("[data-verdict]").forEach((mark) => {
            const verdict = mark.dataset.verdict;
            if (!verdict) return;

            const sentence = mark.textContent ?? "";
            if (!sentence.trim()) return;

            /* Split to characters, keeping words unbreakable so the headline
               wraps exactly where it did before. A split that re-wraps the
               line is a layout shift wearing an animation's clothes. */
            mark.textContent = "";
            const letters: HTMLElement[] = [];
            const words = sentence.split(/(\s+)/);
            for (const word of words) {
              if (/^\s+$/.test(word)) {
                /* A bare text node, not a `white-space: pre` span.
                 *
                 * That span was a visible bug at display size: `pre` stops
                 * the browser collapsing the space, including the one that
                 * lands at the start of a wrapped line — which normally
                 * disappears. So every line after the first began one space
                 * in, and at `clamp(1.85rem, 5vw, 5rem)` a space is about
                 * thirty pixels. "Not another quiz / generated from a /
                 * topic name." had its third line indented against the two
                 * above it, and it read as a broken heading because it was
                 * one. A text node collapses the way type is supposed to. */
                mark.append(document.createTextNode(word));
                continue;
              }
              const wrap = document.createElement("span");
              wrap.className = "inline-block whitespace-nowrap";
              for (const character of word) {
                const span = document.createElement("span");
                span.className = "inline-block";
                span.textContent = character;
                wrap.append(span);
                letters.push(span);
              }
              mark.append(wrap);
            }

            reveals.push(
              gsap.fromTo(
                letters,
                { color: "inherit", fontWeight: "inherit" },
                {
                  color: `var(--${verdict}-mark)`,
                  fontWeight: 700,
                  duration: 0.5,
                  /* Spread across a fixed span rather than per character, so
                     a two-word phrase and a five-word one resolve at the same
                     pace instead of the long one taking twice as long. */
                  stagger: { amount: 0.55, from: "start" },
                  ease: "none",
                  scrollTrigger: {
                    trigger: mark,
                    start: "top 80%",
                    toggleActions: "play none none reverse",
                  },
                },
              ),
            );
          });

          /* The step numbers used to count up from zero, 00 to 01, on
             scroll. Removed. A number animating to its own value is the most
             recognisable tell on a generated landing page — it is the same
             gesture as a fake user counter, and it does not stop being that
             gesture just because the number it lands on is honest. "01" is
             already the smallest, most certain thing on the page; making the
             reader wait for it to finish arriving is asking them to watch a
             label. */

          // Last, once every reveal is registered. Called earlier it could
          // only ever see the ones created so far, which is how the product
          // window stayed at opacity 0.2 while the headline was fine.
          settleReveals();
        }, pageRef);
      },
    );

    return () => {
      cancelled = true;
      navRef.current?.classList.remove("is-light");
      docCleanups.forEach((cleanup) => {
        cleanup();
      });
      hoverCleanups.forEach((cleanup) => {
        cleanup();
      });
      generatedNodes.forEach((node) => {
        node.remove();
      });
      gsapContext?.revert();
    };
  }, [reduceMotion]);

  return (
    <main
      ref={pageRef}
      className="lp-v2 min-h-screen overflow-x-clip bg-background font-sans text-foreground"
    >
      <nav
        ref={navRef}
        /* No bottom border. The waveform sits along this edge and *is* the
           edge — a hairline drawn under it turns the take into a decoration
           sitting on top of a divider, which is two things doing one job and
           was the first thing anybody noticed about it. */
        className="lp-sky-nav fixed inset-x-0 top-0 z-50 text-primary-foreground"
      >
        {/* Scrolling this page is recording.
            This was a two pixel hairline that filled left to right, which is
            the progress bar every site has and says nothing. It is now a
            waveform that lays itself down as you scroll, because the one
            thing this product does is listen to you and mark what you said.
            Reading the page and speaking into it become the same gesture, and
            by the time anybody reaches the demo they have already watched a
            recording being made of their own attention.

            Two layers of identical bars: a dim one showing the whole take, and
            a lit one revealed by a clip that tracks scroll. That is a recorded
            waveform exactly — what has been captured, against what is still
            to come. */}
        <div aria-hidden="true" className="lp-read-through">
          <div className="lp-read-wave lp-read-wave-dim">
            {READ_WAVE.map((height, index) => (
              <span
                key={`dim-${index === 0 ? "a" : index}`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          {/* The recording head.
              A bright mark riding the boundary between what has been captured
              and what has not, which is the one element on the page that is
              unambiguously a machine listening. It is what turns the waveform
              from a picture of a recording into a recording happening. */}
          <span data-read-head aria-hidden="true" className="lp-read-head" />
          <div data-read-through className="lp-read-wave lp-read-wave-lit">
            {READ_WAVE.map((height, index) => (
              <span
                key={`lit-${index === 0 ? "a" : index}`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
        <div className="mx-auto grid h-16 max-w-[76rem] grid-cols-[1fr_auto_1fr] items-center px-5 md:px-8">
          <div className="hidden items-center gap-5 text-[0.78rem] lg:flex">
            <a href="#live-demo" className="lp-nav-link">
              Live demo
            </a>
            <a href="#results" className="lp-nav-link">
              Results
            </a>
            <a href="#how-it-works" className="lp-nav-link">
              How it works
            </a>
          </div>
          <Link
            href="/"
            className="lp-nav-brand flex h-10 items-center justify-center gap-3 whitespace-nowrap text-primary-foreground sm:min-w-52"
            aria-label="Explainaloud home"
          >
            <span className="lp-nav-brand-copy font-sans font-semibold text-[1.05rem] tracking-[-0.025em]">
              Explainaloud
            </span>
            {/* The flyer lands here. Hidden until it arrives, so the mark is
                never doubled and never missing. */}
            <span
              ref={navSlotRef}
              className="block h-9 w-9 shrink-0 opacity-0 transition-opacity duration-150"
            >
              <ExplainaloudMark className="h-9 w-9" />
            </span>
          </Link>
          <div className="flex items-center justify-self-end gap-2">
            <Link
              href="/login"
              className="lp-nav-login whitespace-nowrap px-3 py-2 text-sm sm:px-4"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              data-gsap-hover
              className="lp-nav-cta inline-flex items-center gap-2 whitespace-nowrap border border-card bg-card px-3 py-2 text-card-foreground text-sm sm:px-4"
            >
              Start free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      <section
        id="hero"
        ref={heroRef}
        className="lp-atmosphere relative overflow-hidden bg-primary px-5 text-primary-foreground md:px-8"
      >
        {/* The field itself, generated per frame. It sits under the scrim and
            over the CSS ground, so if WebGL is unavailable or the reader has
            asked for reduced motion the canvas stays empty and the ground
            below is what shows. */}
        <FlowField className="absolute inset-0 z-0 h-full w-full" />
        <div
          aria-hidden="true"
          className="lp-hero-scrim absolute inset-0 z-[1]"
        />

        {/* `fixed` with `top:0; left:0`, and placed entirely by transform, so
            the handler has one number to write instead of fighting a layout.
            It is safe to be fixed again because its position is recomputed
            from scroll every frame rather than animated toward a target. */}
        <div
          id="bg-logo"
          ref={flyerRef}
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-0 z-[60] hidden h-[clamp(10rem,15vw,15rem)] w-[clamp(10rem,15vw,15rem)] origin-top-left text-[length:clamp(10rem,15vw,15rem)] [perspective:1100px] will-change-transform lg:block"
        >
          {/* The turn is on its own element so nothing competes for the
              transform that is carrying the travel. */}
          <div
            ref={flyerSpinRef}
            id="bg-logo-spin"
            className="h-full w-full will-change-transform"
            style={{ transformStyle: "preserve-3d" }}
          >
            <GlassMark className="h-full w-full" />
          </div>
        </div>
        <div className="relative z-[2] flex min-h-screen flex-col pt-20 md:pt-24">
          <div className="relative z-10 mx-auto flex w-full max-w-[76rem] flex-1 flex-col items-center justify-center py-8 text-center lg:items-start lg:text-left">
            <h1 className="relative mx-auto max-w-[12ch] font-display lg:mx-0 lg:max-w-[11ch] text-[clamp(2.2rem,5.4vw,5.4rem)] text-primary-foreground leading-[0.92] tracking-[-0.055em]">
              <span className="block overflow-hidden pb-[0.08em]">
                <span data-hero-word className="inline-block">
                  Say
                </span>{" "}
                <span data-hero-word className="inline-block">
                  what
                </span>{" "}
                <span data-hero-word className="inline-block">
                  you
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.08em]">
                {/* The headline marks itself.
                    Green under what you know, red under what you missed: the
                    product's own two verdicts, drawn with the product's own
                    gesture, on the first sentence anybody reads. It explains
                    the entire idea before a word of copy has been read, and
                    it is the reason the marks further down the page are
                    already legible when they arrive. */}
                <span data-hero-word className="inline-block">
                  <span
                    data-hero-mark="ok"
                    data-verdict="ok"
                    className="lp-verdict whitespace-nowrap"
                  >
                    know.
                  </span>
                </span>{" "}
                <span data-hero-word className="lp-hero-em inline-block">
                  See
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.08em]">
                {/* The mark goes on "missed." alone, never on the phrase.
                    It was on the whole of "what you missed.", which is an
                    inline-block whose text wraps onto two lines. An
                    inline-block does not fragment: it is one box as wide as
                    its widest line, so the rule was drawn once, along the
                    bottom of that box, running the full width of the column
                    and far past the last word. `box-decoration-break` cannot
                    help, because there is only ever one box to decorate.

                    A mark is a verdict on a phrase, so the phrase has to be
                    something that cannot break. One word always is. */}
                <span data-hero-word className="lp-hero-em inline-block">
                  what you{" "}
                  <span
                    data-hero-mark="miss"
                    data-verdict="miss"
                    className="lp-verdict whitespace-nowrap"
                  >
                    missed.
                  </span>
                </span>
              </span>
            </h1>

            <p
              data-hero-secondary
              className="mt-6 max-w-[36rem] text-primary-foreground/85 text-[1.05rem] leading-relaxed lg:max-w-[30rem]"
            >
              Explain your notes out loud for three minutes. Get back every
              point you nailed, rushed, or never reached.
            </p>

            <div
              data-hero-secondary
              className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
            >
              <Link
                href="/signup"
                data-gsap-hover
                className="group inline-flex h-12 items-center gap-5 border border-[var(--accent-solid)] bg-[var(--accent-solid)] px-6 font-medium text-[var(--brand-foreground)]"
              >
                Start explaining
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#how-it-works"
                data-gsap-hover
                className="inline-flex h-12 items-center border border-white/30 px-6 font-medium text-primary-foreground"
              >
                See how it works
              </a>
            </div>
          </div>

          {/* Same measure and same left edge as the headline above it. The
              strip ran centred inside a 46rem box for one build and it read as
              a caption belonging to nothing — a line that starts a hundred and
              fifty pixels to the right of every other line on the screen. */}
          <div className="relative z-10 mx-auto w-full max-w-[76rem] pb-24 md:pb-28">
            <SpokenLine />
          </div>
        </div>
        <div ref={navSentinelRef} aria-hidden="true" className="h-px w-full" />
      </section>

      {/* The demo, and it is the page.
       *
       * What used to sit here was a picture of the product: a fixed transcript,
       * a mic button that did nothing, a waveform on a loop and a card saying
       * what the reader was supposed to imagine happening. It is the single
       * most common shape a landing page takes and it asks to be believed,
       * which is exactly what somebody who has never heard of this will not do.
       *
       * The console below runs. That is the whole difference. */}
      <section
        id="live-demo"
        className="border-border border-b bg-background px-5 pt-16 pb-20 md:px-8 md:pt-24 md:pb-28"
      >
        <div
          data-scroll-reveal
          className="mx-auto mb-10 flex max-w-[76rem] flex-col gap-5 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="font-mono text-[0.67rem] text-brand-ink uppercase tracking-[0.14em]">
              Try it here
            </p>
            <h2 className="mt-5 max-w-[16ch] font-display text-[clamp(1.75rem,4.2vw,3.9rem)] text-strong leading-[1] tracking-[-0.04em]">
              Watch a take get marked,{" "}
              <span data-verdict="ok" className="lp-verdict">
                line by line
              </span>
              .
            </h2>
          </div>
          <p className="max-w-[30rem] text-muted-foreground leading-relaxed md:pb-2">
            Upload, talk, read back the gaps. Pick a subject to switch it.
          </p>
        </div>
        <div className="lp-product-window">
          <DemoConsole />
        </div>
        <p className="mx-auto mt-6 flex max-w-[76rem] items-center gap-2 text-muted-foreground text-xs">
          <LockKeyhole className="h-3.5 w-3.5" /> Audio is never stored.
        </p>
      </section>

      {/* The "why". The page demonstrated the product at length and never made
          an argument for it: a reader who already owns flashcards had no reason
          given to want this. Three contrasts, no competitor named and no
          claim that cannot be checked by thinking about it. */}
      <section
        data-scroll-reveal
        className="border-border border-y bg-card px-5 py-20 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-[76rem]">
          <p className="font-mono text-[0.67rem] text-brand-ink uppercase tracking-[0.14em]">
            Why out loud
          </p>
          {/* The one headline on the page that carries the argument, so it is
              the one that gets read to you: the words come up out of the stock
              as the section arrives, scrubbed against scroll rather than
              played on a timer, which is what makes it read as pacing instead
              of as an effect. Split in JS, so the markup stays one sentence
              and a reader with no script still gets the sentence. */}
          <h2 className="mt-5 max-w-[20ch] font-display text-[clamp(1.7rem,4vw,3.6rem)] text-strong leading-[1.02] tracking-[-0.04em]">
            A quiz can be passed by recognising. Saying it cannot.
          </h2>
          {/* Three equal columns, twice.
           *
           * This block and the three steps under "how it works" were the same
           * shape at the same width one scroll apart — heading, paragraph,
           * heading, paragraph, heading, paragraph, and then again. Each was
           * defensible on its own and together they made the middle of the
           * page read as a template with the content swapped, which is what
           * "it all looks the same" actually means.
           *
           * So this one stops being a grid of peers. The first line is the
           * headline restated as a claim, and the other two are why it is
           * true, which is a real hierarchy the layout was flattening. It
           * takes five columns of twelve and a size step; the supports take
           * four and three, divided by the same hairline the page already
           * uses everywhere else. The steps below keep their equal widths and
           * change their vertical position instead, so the two blocks are now
           * different in the two different ways their content is. */}
          <div className="relative mt-12 grid gap-10 border-border border-y py-10 md:grid-cols-12 md:gap-0">
            <CornerMarks />
            {whyOutLoud.map((item, index) => (
              <article
                key={item.title}
                className={
                  [
                    "md:col-span-5 md:pr-12",
                    "md:col-span-4 md:border-border md:border-l md:px-10",
                    "md:col-span-3 md:border-border md:border-l md:pl-10",
                  ][index]
                }
              >
                <h3
                  className={
                    index === 0
                      ? "max-w-[16ch] font-display text-[1.45rem] text-strong leading-[1.15] tracking-[-0.03em]"
                      : "font-semibold text-[1.02rem] text-strong tracking-[-0.02em]"
                  }
                >
                  {item.title}
                </h3>
                <p
                  className={
                    index === 0
                      ? "mt-4 max-w-[34ch] text-[1.05rem] text-muted-foreground leading-relaxed"
                      : "mt-3 text-[0.96rem] text-muted-foreground leading-relaxed"
                  }
                >
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ResultsCarousel />

      <section
        id="how-it-works"
        data-story-section
        data-scroll-reveal
        className="overflow-hidden border-border border-t bg-card py-24 md:py-32"
      >
        {/* The horizontal padding is on the blocks rather than the section,
            because the track below has to be able to run off the right edge
            and a padded parent would clip it short of the screen. */}
        <div className="mx-auto max-w-[76rem] px-5 md:px-8">
          <p
            data-story-step
            className="font-mono text-[0.68rem] text-brand-ink uppercase tracking-[0.13em]"
          >
            Rehearse it, or learn it
          </p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-20">
            <h2 className="max-w-[12ch] font-display text-[clamp(1.85rem,4.6vw,4.6rem)] text-strong leading-[1] tracking-[-0.04em]">
              Understanding shows up when you speak.
            </h2>
            <p
              data-story-step
              className="max-w-[36rem] text-muted-foreground leading-relaxed"
            >
              Feynman&rsquo;s method: explain it plainly out loud, and watch for
              the place you get stuck.
            </p>
          </div>
        </div>

        {/* Three steps, on one rule.
         *
         * This was briefly a pinned horizontal track — the signature GSAP
         * move, and the wrong one here. It only travels if the content is
         * wider than the window, and three cards are not: measured at 1424px
         * against a 1440px viewport, so the pin engaged and moved the track
         * zero pixels. On a 27-inch monitor it would be further from working,
         * not closer. An effect whose whole existence depends on the reader's
         * screen being narrow enough is a bug with good timing.
         *
         * What is left is the thing the pin was for — that these are an order
         * of operations rather than three features — done with a rule that
         * draws itself across the row as the section arrives, and the three
         * verdict colours marking the steps in the order a rehearsal produces
         * them. It works identically at 390px and at 2560px. */}
        {/* The rule above each step stays at every width, and at desktop the
            three of them sit at three heights. Read left to right they are a
            flight of stairs, which is what an order of operations looks like
            when the layout says it rather than the numbering — the 01/02/03
            was carrying that on its own, and a number in a corner is a label,
            not a shape. It is also the one structural idea borrowed from
            Haikei's layered steps that survives this page's rules: as a
            terraced field behind the type it would be a decoration under a
            paragraph, and as the alignment of the paragraphs themselves it is
            the paragraphs. */}
        <div className="relative mt-16 md:mt-20">
          <div className="mx-auto grid max-w-[76rem] gap-10 px-5 md:px-8 lg:grid-cols-3 lg:items-start lg:gap-8">
            {steps.map((step, index) => (
              <article
                key={step.number}
                data-feature-card
                className={`relative border-border border-t pt-7 ${
                  ["", "lg:mt-11", "lg:mt-22"][index]
                }`}
              >
                <span
                  aria-hidden="true"
                  className="-top-px absolute left-0 h-[2px] w-16"
                  style={{
                    backgroundColor: [
                      "var(--ok)",
                      "var(--vague)",
                      "var(--miss)",
                    ][index],
                  }}
                />
                <span className="font-mono text-[0.67rem] text-muted-foreground tabular-nums tracking-[0.13em]">
                  {step.number}
                </span>
                <h3 className="mt-4 max-w-[18ch] font-display text-[clamp(1.3rem,2.4vw,2.2rem)] text-strong leading-[1.1] tracking-[-0.03em]">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-[34ch] text-muted-foreground leading-relaxed">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-[76rem] border-border border-y">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <article
              data-feature-card
              className="border-border py-12 pr-0 lg:border-r lg:py-20 lg:pr-16"
            >
              <p className="font-mono text-[0.67rem] text-muted-foreground uppercase tracking-[0.13em]">
                Grounded in your material
              </p>
              <h2 className="mt-6 max-w-[13ch] font-display text-[clamp(1.85rem,5vw,5rem)] text-strong leading-[0.98] tracking-[-0.045em]">
                Not another quiz generated from{" "}
                <span data-verdict="miss" className="lp-verdict">
                  a topic name
                </span>
                .
              </h2>
              <p className="mt-7 max-w-[38rem] text-[1.08rem] text-muted-foreground leading-relaxed">
                Every claim stays tied to a quote from your own file.
              </p>
            </article>

            <div className="grid border-border border-t lg:border-t-0">
              <article
                data-feature-card
                className="border-border border-b py-10 lg:py-12 lg:pl-14"
              >
                <span className="font-mono text-[0.65rem] text-muted-foreground uppercase tracking-[0.12em]">
                  While the thought is fresh
                </span>
                <h3 className="mt-4 max-w-[19ch] font-display text-[2rem] text-strong leading-tight">
                  Feedback arrives while you are still explaining.
                </h3>
                <p className="mt-4 max-w-[31rem] text-muted-foreground leading-relaxed">
                  Correct, vague or incomplete in real time.
                </p>
              </article>
              <article data-feature-card className="py-10 lg:py-12 lg:pl-14">
                <span className="font-mono text-[0.65rem] text-muted-foreground uppercase tracking-[0.12em]">
                  Your pace, not a population
                </span>
                <h3 className="mt-4 max-w-[19ch] font-display text-[2rem] text-strong leading-tight">
                  Measured against your own speaking baseline.
                </h3>
                <p className="mt-4 max-w-[31rem] text-muted-foreground leading-relaxed">
                  Thinking pauses come out of the count.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <FriendsAndStreaks />

      {/* Partners.
       *
       * One partner, shown once, low on the page. `design.md` bans invented
       * proof here and the ban is doing real work — but it bans *invented*
       * proof, and this partnership is a fact somebody can check by following
       * the link. What the rule still governs is the shape: a logo wall under
       * the hero is a page claiming momentum, so this is one block above the
       * close, ruled top and bottom like everything around it.
       *
       * The label and the link sit on one line over a hairline, and the mark
       * is centred under a sentence it finishes. That last part is why the
       * caption ends on "of" and is not a typo: the logo is the object of the
       * sentence, so it is read rather than merely displayed.
       *
       * No colour is added to the page. The mark's own navy is within a few
       * values of `--panel-deep`, and the short rule under it is the mark's
       * own gold — sampled from the lion rather than chosen, and scoped to
       * this block, because it belongs to the partner's identity rather than
       * to this page's palette. It is a third of the mark's width, which is
       * what stops it reading as a dash somebody left behind — at the 4rem
       * the verdict caps use it looked orphaned under a mark this size, and
       * that cap sits at the left end of a full rule rather than alone under
       * a centred block. Same idea, different proportion, because the
       * position is different. */}
      <section
        data-scroll-reveal
        className="px-5 pb-24 md:px-8 md:pb-32"
        aria-labelledby="partners-heading"
      >
        <div className="mx-auto max-w-[76rem] border-border border-y">
          <div className="flex items-center justify-between gap-6 border-border border-b py-5">
            <h2
              id="partners-heading"
              className="font-semibold text-[0.95rem] text-strong tracking-[-0.01em]"
            >
              Partners
            </h2>
            <a
              href={YRI_URL}
              target="_blank"
              rel="noopener"
              className="press group inline-flex items-center gap-1.5 font-medium text-[0.95rem] text-brand-ink underline-offset-[6px] hover:underline"
            >
              Visit YRI Fellowship
              <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none" />
            </a>
          </div>

          <div className="flex flex-col items-center py-14 text-center md:py-16">
            <p className="text-[1.05rem] text-muted-foreground">
              Explainaloud is a partner of
            </p>
            <a
              href={YRI_URL}
              target="_blank"
              rel="noopener"
              aria-label="YRI Fellowship"
              className="mt-7 inline-block outline-none transition-opacity duration-200 hover:opacity-70 focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)] motion-reduce:transition-none"
            >
              {/* A fixed-size mark, so there is nothing for the optimiser to
                  decide, and the file is already the size it renders at. */}
              {/* biome-ignore lint/performance/noImgElement: fixed-size partner mark, pre-sized asset */}
              <img
                src="/landing/yri-fellowship-logo.webp"
                width={823}
                height={165}
                alt="YRI Fellowship"
                className="h-auto w-[15.5rem] md:w-[22rem]"
              />
            </a>
            <span
              aria-hidden="true"
              className="mt-9 h-[2px] w-28"
              style={{ backgroundColor: YRI_GOLD }}
            />
          </div>
        </div>
      </section>

      {/* The close is the open, again.
          It was still carrying the retired WebP as a background image, which
          is how the page ended up with two different answers to the same
          question one scroll apart. The first screen and the last one are the
          same world, so the last one runs the same water: same ground, same
          field, same scrim. It is also the page's one sanctioned inversion
          back into dark, and arriving somewhere the reader has already been
          is what makes that read as a close rather than as a sixth section. */}
      <section className="lp-atmosphere relative overflow-hidden px-5 pt-28 pb-20 md:px-8 md:pt-36 md:pb-28">
        <FlowField className="absolute inset-0 z-0 h-full w-full" />
        <SteppedEdge />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(4,12,26,0.62),rgba(3,9,20,0.78))]"
        />
        <div
          data-scroll-reveal
          className="relative z-[2] mx-auto max-w-[68rem] border border-white/15 bg-[var(--panel-deep)] px-6 py-16 text-left text-primary-foreground md:px-12 md:py-24"
        >
          {/* A sparkle icon rocking back and forth on a four-second loop
              lived here. Sparkles are the universal badge for "an AI did
              this", and a decoration that never stops moving above the one
              button on the page is competing with the button. */}
          <p className="font-mono text-[0.67rem] uppercase tracking-[0.13em] opacity-60">
            Know before it matters
          </p>
          {/* Wider and a step smaller than the other headlines, on purpose. At
              `11ch` the marked quotation broke across two lines, and a rule
              under half a phrase on one line and the rest of it on the next
              reads as a layout fault rather than as a mark, however correctly
              it is painted. `whitespace-nowrap` guarantees it: the mark is a
              verdict on one phrase, so the phrase has to be one phrase. */}
          {/* `leading-[1.28]`, looser than every other headline here, and the
              marked phrase is why. A rule drawn under line one lands in the
              space above line two, and at `1.02` there is no such space: the
              rule was sitting on the ascenders of "certainty", touching the
              `i` and the `t`. Display type wants tight leading right up until
              something has to be drawn between the lines, and then the leading
              is what has to give. */}
          <h2 className="mx-auto mt-5 max-w-[17ch] font-display text-[clamp(1.9rem,4.6vw,4.4rem)] leading-[1.28] tracking-[-0.045em]">
            Turn{" "}
            <span data-verdict="vague" className="lp-verdict whitespace-nowrap">
              “I think I know it”
            </span>{" "}
            into certainty.
          </h2>
          <Link
            href="/signup"
            data-gsap-hover
            className="group mt-9 inline-flex h-12 items-center gap-2 bg-card px-6 font-medium text-card-foreground"
          >
            Start free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="mt-5 text-sm opacity-60">
            No audio stored. Free to start.
          </p>
        </div>
      </section>

      <SignupNudge />

      <footer className="mx-auto flex max-w-[76rem] flex-wrap items-center gap-5 px-5 py-8 text-muted-foreground text-sm md:px-8">
        <span className="flex items-center gap-2 text-foreground">
          <ExplainaloudMark className="h-7 w-7" /> Explainaloud
        </span>
        <Link href="/privacy" className="ml-auto hover:text-foreground">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Terms
        </Link>
      </footer>
    </main>
  );
}
