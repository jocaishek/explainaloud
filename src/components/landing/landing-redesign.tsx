"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, LockKeyhole, Mic } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ExplainaloudMark } from "~/components/explainaloud-mark";
import { DemoConsole } from "~/components/landing/demo-console";
import { FlowField } from "~/components/landing/flow-field";
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

const ease = [0.23, 1, 0.32, 1] as const;

const waveform = [
  { id: "a", height: 10 },
  { id: "b", height: 22 },
  { id: "c", height: 15 },
  { id: "d", height: 30 },
  { id: "e", height: 18 },
  { id: "f", height: 26 },
  { id: "g", height: 13 },
  { id: "h", height: 34 },
  { id: "i", height: 20 },
  { id: "j", height: 28 },
  { id: "k", height: 12 },
  { id: "l", height: 22 },
] as const;

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

/** The tallest bar. Every bar is laid out at this height and scaled down to
 *  its own, so one box size serves all twelve and nothing re-lays-out. */
const WAVEFORM_MAX = 34;

/**
 * The three verdicts, as the hero states them.
 *
 * Ordered the way a rehearsal produces them rather than by severity, because
 * the panel below reveals them one at a time and the sequence is the argument:
 * you said this, you rushed this, you never reached this.
 */
const liveResults = [
  {
    id: "reached",
    verdict: "Reached",
    point: "The problem your audience actually has",
    color: "var(--ok)",
    tint: "var(--ok-light)",
  },
  {
    id: "thin",
    verdict: "Too thin",
    point: "The evidence behind your main claim",
    color: "var(--vague)",
    tint: "var(--vague-light)",
  },
  {
    id: "missed",
    verdict: "Missed",
    point: "How the handoff works at the end",
    color: "var(--miss)",
    tint: "var(--miss-light)",
  },
] as const;

/**
 * The hero's product panel.
 *
 * The previous version was a recorder and nothing else — a mic, a waveform and
 * a stop button, which is a screenshot of Voice Memos and says nothing about
 * what this page is selling. What makes the product legible is not that it
 * records you but that key points resolve into verdicts while you talk, so the
 * panel now shows that happening: the checklist fills in, one line at a time,
 * and starts over.
 */
function LiveRehearsalPanel() {
  const reduceMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(reduceMotion ? 3 : 0);
  const [seconds, setSeconds] = useState(17);

  useEffect(() => {
    if (reduceMotion) {
      setRevealed(liveResults.length);
      return;
    }
    const interval = window.setInterval(() => {
      // One past the last line, so the completed list holds for a beat before
      // the run restarts — otherwise the third verdict is never actually read.
      setRevealed((current) => (current + 1) % (liveResults.length + 1));
    }, 1600);
    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = window.setInterval(() => {
      setSeconds((current) => (current + 1) % 600);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;

  return (
    <section
      aria-label="What Explainaloud shows while you rehearse"
      className="mx-auto w-full max-w-[46rem] border border-white/20 bg-[var(--panel-deep)] text-primary-foreground shadow-[6px_7px_0_rgba(4,14,32,0.72)]"
    >
      <div className="flex items-center gap-4 border-white/12 border-b px-4 py-3.5 sm:px-5">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--miss)] text-white">
          {!reduceMotion && (
            <span className="absolute inset-0 animate-ping rounded-full border border-white/35 opacity-40" />
          )}
          <Mic className="relative h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.15em]">
            Rehearsing out loud
          </p>
          <p className="mt-1 truncate text-primary-foreground/60 text-sm">
            Checking your talk against its key points
          </p>
        </div>
        <div
          className="hidden h-7 items-end gap-[3px] sm:flex"
          aria-hidden="true"
        >
          {/* `scaleY`, not `height`.
              These twelve bars used to animate `height`, which is a layout
              property: every frame, for as long as the hero was on screen,
              the browser re-ran layout for the whole row. A waveform is
              decoration and it was the most expensive thing on the page.
              `scaleY` on a solid rectangle is visually identical and is
              composited, so it costs nothing. `origin-bottom` is what keeps
              the bars growing upward out of the baseline rather than from
              their centres. */}
          {waveform.map(({ id, height }, index) => (
            <motion.span
              key={id}
              style={{ height: WAVEFORM_MAX }}
              initial={false}
              animate={
                reduceMotion
                  ? { scaleY: (height / WAVEFORM_MAX) * 0.62 }
                  : {
                      scaleY: [
                        (height / WAVEFORM_MAX) * 0.42,
                        (height / WAVEFORM_MAX) * 0.82,
                        (height / WAVEFORM_MAX) * 0.5,
                      ],
                    }
              }
              transition={{
                duration: 1.35 + index * 0.04,
                repeat: Number.POSITIVE_INFINITY,
                delay: index * 0.055,
                ease: "easeInOut",
              }}
              className="w-1 origin-bottom rounded-full bg-[var(--ok-light)]"
            />
          ))}
        </div>
        <span className="shrink-0 font-mono text-[0.62rem] text-primary-foreground/60 tracking-[0.12em] tabular-nums">
          {clock}
        </span>
      </div>

      <ul className="divide-y divide-white/10">
        {liveResults.map((result, index) => {
          const isRevealed = index < revealed;
          return (
            <li
              key={result.id}
              className="flex items-start gap-3 px-4 py-2 sm:items-center sm:px-5"
            >
              <span
                aria-hidden="true"
                className="mt-[0.45rem] h-2.5 w-2.5 shrink-0 transition-colors duration-500 sm:mt-0"
                style={{
                  backgroundColor: isRevealed
                    ? result.color
                    : "rgba(238, 242, 248, 0.16)",
                }}
              />
              <span
                className="min-w-0 flex-1 text-sm leading-snug transition-opacity duration-500 sm:truncate"
                style={{ opacity: isRevealed ? 0.9 : 0.4 }}
              >
                {result.point}
              </span>
              <motion.span
                initial={false}
                animate={
                  isRevealed
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: reduceMotion ? 0 : 4 }
                }
                transition={{ duration: 0.32, ease }}
                className="mt-[0.3rem] shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.12em] sm:mt-0"
                style={{ color: result.tint }}
              >
                {result.verdict}
              </motion.span>
            </li>
          );
        })}
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

        <div className="relative overflow-hidden rounded-[1.1rem] border border-border bg-card p-4 shadow-[7px_8px_0_rgba(15,35,64,0.22)] md:p-6">
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
          <h2
            data-resolve
            className="mt-5 font-display text-[clamp(1.7rem,3.4vw,3.4rem)] text-strong leading-[1.02] tracking-[-0.04em]"
          >
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

          gsap.fromTo(
            "[data-gsap-lock]",
            { x: -42 },
            { x: 0, duration: 0.62, stagger: 0.06, ease: "expo.out" },
          );

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
          gsap.utils
            .toArray<HTMLElement>("[data-scroll-reveal]")
            .forEach((element) => {
              const parts = Array.from(element.children) as HTMLElement[];
              const targets = parts.length > 1 ? parts : [element];
              reveals.push(
                gsap.from(targets, {
                  y: 26,
                  opacity: 0,
                  duration: 0.72,
                  stagger: 0.09,
                  ease: "power3.out",
                  scrollTrigger: {
                    trigger: element,
                    start: "top 85%",
                    toggleActions: "play none none reverse",
                  },
                }),
              );
            });

          /* Headings resolve, rather than arrive.
             They come in soft and slightly spread and settle into focus, which
             is a specific thing to borrow and not a general prettiness: it is
             the product's own vocabulary. A vague claim and a checkable one
             differ exactly by whether they are sharp enough to judge, and the
             page's three verdicts are built on that distinction. So the
             headings do what a rehearsal does — start indistinct, come good.

             `filter` is a repaint, which is why this is scoped to headings and
             given a short duration rather than scrubbed. `willChange` is set
             for the tween and cleared after, so the promoted layer does not
             outlive the animation that needed it. */
          gsap.utils.toArray<HTMLElement>("[data-resolve]").forEach((el) => {
            reveals.push(
              gsap.fromTo(
                el,
                {
                  filter: "blur(11px)",
                  opacity: 0.25,
                  letterSpacing: "0.06em",
                  willChange: "filter, opacity",
                },
                {
                  filter: "blur(0px)",
                  opacity: 1,
                  letterSpacing: "-0.04em",
                  duration: 0.85,
                  ease: "power2.out",
                  onComplete: () => gsap.set(el, { clearProps: "willChange" }),
                  scrollTrigger: {
                    trigger: el,
                    start: "top 84%",
                    toggleActions: "play none none reverse",
                  },
                },
              ),
            );
          });

          /* The console opens rather than appears: it comes in from slightly
             below and slightly small, and the ease overshoots a hair so it
             seats itself. This is the one thing on the page a reader is meant
             to reach for, and it should feel like a piece of equipment being
             set down in front of them. */
          reveals.push(
            gsap.from(".lp-product-window", {
              y: 70,
              scale: 0.955,
              opacity: 0,
              duration: 1.05,
              transformOrigin: "50% 100%",
              ease: "back.out(1.15)",
              scrollTrigger: {
                trigger: ".lp-product-window",
                start: "top 88%",
                toggleActions: "play none none reverse",
              },
            }),
          );

          gsap.utils
            .toArray<HTMLElement>("[data-feature-card]")
            .forEach((element, index) => {
              /* Settling, not sliding. The card comes up a little and
                 finishes arriving *slightly large*, then relaxes to size —
                 which is what an object landing on a surface does, and is the
                 whole difference between a card that appears and a card that
                 arrives. `transformOrigin` at the top so it grows down from
                 its own rule rather than pushing the rule around.

                 No horizontal component anywhere: the marks, the waveform and
                 the transcript already own left-to-right, and a fourth sweep
                 made the page read as one effect applied everywhere. */
              reveals.push(
                gsap.fromTo(
                  element,
                  { y: 30, opacity: 0, scale: 0.985 },
                  {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    transformOrigin: "50% 0%",
                    duration: 0.85,
                    delay: (index % 3) * 0.1,
                    ease: "back.out(1.1)",
                    scrollTrigger: {
                      trigger: element,
                      start: "top 86%",
                      toggleActions: "play none none reverse",
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

          /* The argument headlines resolve character by character, scrubbed
             against scroll.
             Word-level opacity lived here and it was the polite version of
             this effect: legible, tidy, and not worth looking at. Characters
             are what make it read as craft, because the eye cannot track them
             individually — it sees a wave of focus travelling through a
             sentence, which is a texture rather than a list of steps.

             Each character carries blur, a small lift and a slight horizontal
             compression, and they overlap heavily, so at any moment there are
             a dozen mid-resolve rather than one. That overlap is the whole
             effect: a hard stagger with no overlap is a ticker, and a ticker
             is what "basic" looks like.

             Scrubbed, so the reader is doing it. The sentence comes into focus
             at exactly the rate they scroll, which ties the effect to their
             hand instead of playing at them.

             Split in JS so the DOM keeps one sentence until a script runs: a
             screen reader gets prose rather than a pile of single letters, and
             a failed import leaves plain type. */
          gsap.utils
            .toArray<HTMLElement>("[data-scrub-words]")
            .forEach((heading) => {
              const sentence = heading.textContent ?? "";
              if (!sentence.trim()) return;
              heading.textContent = "";

              /* Words wrap, characters do not. Each word is an inline-block so
                 the line breaks stay exactly where they were, and the
                 characters inside it are spans that can be animated without
                 ever becoming a break opportunity. Splitting straight to
                 characters re-wraps the headline mid-word, which is a layout
                 shift wearing an animation's clothes. */
              const letters: HTMLElement[] = [];
              const words = sentence.trim().split(/\s+/);
              words.forEach((word, wordIndex) => {
                const wordEl = document.createElement("span");
                wordEl.className = "inline-block whitespace-nowrap";
                for (const character of word) {
                  const span = document.createElement("span");
                  span.className = "inline-block";
                  span.textContent = character;
                  wordEl.append(span);
                  letters.push(span);
                }
                heading.append(wordEl);
                if (wordIndex < words.length - 1) {
                  const gap = document.createElement("span");
                  gap.className = "inline-block whitespace-pre";
                  gap.textContent = " ";
                  heading.append(gap);
                }
              });

              reveals.push(
                gsap.fromTo(
                  letters,
                  {
                    opacity: 0.08,
                    filter: "blur(7px)",
                    yPercent: 22,
                    scaleX: 0.94,
                  },
                  {
                    opacity: 1,
                    filter: "blur(0px)",
                    yPercent: 0,
                    scaleX: 1,
                    ease: "none",
                    /* `amount` rather than a per-item delay: the whole run is
                       spread across this many seconds however many characters
                       there are, so a long headline and a short one resolve at
                       the same pace instead of the long one taking twice the
                       scroll. */
                    stagger: { amount: 0.9, from: "start" },
                    scrollTrigger: {
                      trigger: heading,
                      start: "top 88%",
                      end: "bottom 52%",
                      scrub: 0.5,
                    },
                  },
                ),
              );
            });

          /* The page marks its own copy.
             This is the one piece of motion here that belongs to this product
             and could not be lifted onto another site. Everything else in
             this file is a well made generic: things rise as they arrive, a
             rule draws, a bar tracks scroll. None of them say what the thing
             does. This does, because it is the exact gesture the grader makes
             on a transcript, in the exact three colours, so by the time a
             reader reaches the demo they can already read a mark without
             having been shown a legend.

             Not scrubbed. A grader does not underline a phrase gradually as
             you scroll toward it; it decides, and then the rule goes down at
             one speed. Scrubbing this would turn a verdict into a slider,
             which is precisely the wrong idea about the product.

             `toggleActions` for the same reason every other reveal has it:
             coming back up the page and down again should mark them again
             rather than present a page that is finished with you. */
          gsap.utils.toArray<HTMLElement>(".lp-mark").forEach((mark) => {
            reveals.push(
              gsap.fromTo(
                mark,
                { backgroundSize: "0% 0.085em" },
                {
                  backgroundSize: "100% 0.085em",
                  duration: 0.62,
                  ease: "power2.inOut",
                  scrollTrigger: {
                    trigger: mark,
                    start: "top 78%",
                    toggleActions: "play none none reverse",
                  },
                },
              ),
            );
          });

          /* The rule draws itself across the three steps. Scrubbed, so it is
             a readout of where the reader is in the section rather than an
             animation that happens at them — and `scaleX` on a hairline is a
             composited transform, which is why this is affordable where a
             pinned track was not. */
          /* The step numbers roll. 01, 02, 03 count up from zero as the
             section arrives — a different mechanism from everything else here,
             and the one that suits three ordered things: you watch the
             sequence being numbered rather than watching another line grow.
             The horizontal rule that used to draw across them is gone; it was
             the fifth left-to-right sweep on one page. */
          gsap.utils.toArray<HTMLElement>("[data-step-count]").forEach((el) => {
            const target = Number(el.dataset.stepCount ?? "0");
            const counter = { value: 0 };
            reveals.push(
              gsap.to(counter, {
                value: target,
                duration: 0.9,
                ease: "power2.out",
                onUpdate: () => {
                  el.textContent = String(Math.round(counter.value)).padStart(
                    2,
                    "0",
                  );
                },
                scrollTrigger: {
                  trigger: el,
                  start: "top 88%",
                  toggleActions: "play none none reverse",
                },
              }),
            );
          });

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
        className="lp-sky-nav fixed inset-x-0 top-0 z-50 border-white/20 border-b text-primary-foreground"
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
                    className="lp-mark lp-mark-ok whitespace-nowrap"
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
                    className="lp-mark lp-mark-miss whitespace-nowrap"
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
              data-gsap-lock
              className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
            >
              <Link
                href="/signup"
                data-gsap-hover
                className="group inline-flex h-12 items-center gap-5 border border-[var(--accent-solid)] bg-[var(--accent-solid)] px-6 font-medium text-[var(--brand-foreground)] shadow-[4px_4px_0_rgba(6,18,38,0.85)]"
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

          <div className="relative z-10 pb-24 md:pb-28">
            <LiveRehearsalPanel />
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
            <h2
              data-resolve
              className="mt-5 max-w-[16ch] font-display text-[clamp(1.75rem,4.2vw,3.9rem)] text-strong leading-[1] tracking-[-0.04em]"
            >
              Watch a take get marked,{" "}
              <span className="lp-mark lp-mark-ok">line by line</span>.
            </h2>
          </div>
          <p className="max-w-[30rem] text-muted-foreground leading-relaxed md:pb-2">
            Press play. Drag the rail to replay any part.
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
          <h2
            data-scrub-words
            className="mt-5 max-w-[20ch] font-display text-[clamp(1.7rem,4vw,3.6rem)] text-strong leading-[1.02] tracking-[-0.04em]"
          >
            A quiz can be passed by recognising. Saying it cannot.
          </h2>
          <div className="mt-12 grid gap-10 border-border border-t pt-10 md:grid-cols-3 md:gap-12">
            {whyOutLoud.map((item) => (
              <article key={item.title}>
                <h3 className="font-semibold text-lg text-strong tracking-[-0.02em]">
                  {item.title}
                </h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
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
            <h2
              data-scrub-words
              className="max-w-[12ch] font-display text-[clamp(1.85rem,4.6vw,4.6rem)] text-strong leading-[1] tracking-[-0.04em]"
            >
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
        <div className="relative mt-16 md:mt-20">
          <div className="mx-auto grid max-w-[76rem] gap-10 px-5 md:px-8 lg:grid-cols-3 lg:gap-8">
            {steps.map((step, index) => (
              <article
                key={step.number}
                data-feature-card
                className="relative border-border border-t pt-7 lg:border-t-0"
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
                <span
                  data-step-count={step.number}
                  className="font-mono text-[0.67rem] text-muted-foreground tabular-nums tracking-[0.13em]"
                >
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
              <h2
                data-resolve
                className="mt-6 max-w-[13ch] font-display text-[clamp(1.85rem,5vw,5rem)] text-strong leading-[0.98] tracking-[-0.045em]"
              >
                Not another quiz generated from{" "}
                <span className="lp-mark lp-mark-miss">a topic name</span>.
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

      {/* The close is the open, again.
          It was still carrying the retired WebP as a background image, which
          is how the page ended up with two different answers to the same
          question one scroll apart. The first screen and the last one are the
          same world, so the last one runs the same water: same ground, same
          field, same scrim. It is also the page's one sanctioned inversion
          back into dark, and arriving somewhere the reader has already been
          is what makes that read as a close rather than as a sixth section. */}
      <section className="lp-atmosphere relative overflow-hidden px-5 py-20 md:px-8 md:py-28">
        <FlowField className="absolute inset-0 z-0 h-full w-full" />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(4,12,26,0.62),rgba(3,9,20,0.78))]"
        />
        <div
          data-scroll-reveal
          className="relative z-[2] mx-auto max-w-[68rem] border border-white/15 bg-[var(--panel-deep)] px-6 py-16 text-left text-primary-foreground shadow-[6px_6px_0_rgba(4,14,32,0.55)] md:px-12 md:py-24"
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
            <span className="lp-mark lp-mark-vague whitespace-nowrap">
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
