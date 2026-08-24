"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ExplainaloudMark } from "~/components/explainaloud-mark";
import { DemoConsole } from "~/components/landing/demo-console";
import { FriendsAndStreaks } from "~/components/landing/friends-streaks";
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
function CornerMarks({ tone = "text-border" }: { tone?: string }) {
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
          className={`pointer-events-none absolute size-[11px] ${tone} ${position}`}
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

/**
 * The hero waveform, speech-shaped for the same reasons `READ_WAVE` is:
 * runs of loud syllables, breath dips, one long quiet stretch. Identical on
 * server and client, so nothing random. Each bar's delay walks the same
 * 0.5-2.5s window the words light across, so the strip reads as the audio of
 * the sentence above it.
 */
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
  }, []);

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

          /* The one set-piece: the three steps, played.
           *
           * A pinned horizontal track was tried here once and removed,
           * correctly: it pinned three cards that were 1424px wide inside a
           * 1440px window and travelled zero pixels, so the page locked and
           * nothing happened. The note left behind was that an effect whose
           * existence depends on the reader's screen being narrow enough is a
           * bug with good timing, and that is still true.
           *
           * Two things are different. The track is *authored* wide — three
           * panels at 46vw with 7vw gutters and lead-ins at either end — so
           * the travel is real at 1440px and at 2560px alike, and the guard
           * below refuses to run at all if the measured distance is small.
           *
           * And it holds itself still with `position: sticky` rather than
           * with ScrollTrigger's `pin`. That is not a stylistic preference.
           * `pin` rewrites the element to `position: fixed` and computes a
           * `top` from measurements taken when the trigger was built — and
           * this page is still growing at that moment, because the display
           * font has not landed. Measured with the pin: the stage sat at
           * `top: -825px` through the whole run, which is a locked page with
           * nothing on it. Sticky has no arithmetic to get wrong. The runway
           * above it is a plain height, and the only thing the script does is
           * slide the track and keep that height in step with the viewport.
           *
           * The head is fixed at a third of the width and the take goes past
           * it. Crossing it marks a step: the rule draws across the panel and
           * the step comes up to full. The clock underneath runs the length of
           * a rehearsal, because that is what is being scrubbed. */
          const rail = document.querySelector<HTMLElement>("[data-steps-rail]");
          const stage =
            document.querySelector<HTMLElement>("[data-steps-stage]");
          const track =
            document.querySelector<HTMLElement>("[data-steps-track]");
          const clock =
            document.querySelector<HTMLElement>("[data-steps-clock]");

          if (
            rail &&
            stage &&
            track &&
            !reduceMotion &&
            window.innerWidth >= 1024
          ) {
            stage.classList.add("is-live");
            track.classList.add("is-live");

            const distance = () =>
              Math.max(0, track.scrollWidth - window.innerWidth);

            if (distance() > window.innerWidth * 0.5) {
              const stepEls = Array.from(
                track.querySelectorAll<HTMLElement>("[data-step]"),
              );

              /* The runway is exactly as long as the travel, so the track is
                 still moving for every pixel the stage is stuck — a sticky
                 section that holds after its content has stopped is a dead
                 screen somebody has to scroll through. */
              const sizeRail = () => {
                rail.style.height = `${window.innerHeight + distance()}px`;
              };
              sizeRail();
              ScrollTrigger.addEventListener("refreshInit", sizeRail);
              docCleanups.push(() =>
                ScrollTrigger.removeEventListener("refreshInit", sizeRail),
              );

              /* The head is a screen position, so the test is where a panel
                 is *now* rather than what fraction of the tween has elapsed —
                 which keeps it honest through a resize, a refresh, or a
                 reader who lands in the middle of the run. */
              const markPassed = () => {
                const head = window.innerWidth * 0.32;
                for (const step of stepEls) {
                  step.dataset.lit =
                    step.getBoundingClientRect().left <= head ? "1" : "0";
                }
              };

              /* The marking runs off the *tween*, not off the trigger.
                 A scrub keeps animating for a beat after the scroll stops, and
                 ScrollTrigger's own `onUpdate` only fires on scroll — so the
                 last frames of every run went unmarked and the third step
                 stayed dim at the end of the track. */
              /* The clock reads the track's own position rather than the
                 trigger's progress. Reaching for the tween from inside its
                 own `onUpdate` is a temporal-dead-zone error — GSAP fires the
                 first update during construction, before the variable holding
                 it exists — and this is truer anyway: it is a readout of where
                 the take actually is, not of how far the scroll has got. */
              const paint = () => {
                markPassed();
                if (!clock) return;
                const travelled = -(Number(gsap.getProperty(track, "x")) || 0);
                const total = distance() || 1;
                const seconds = Math.round(
                  Math.min(1, Math.max(0, travelled / total)) * 180,
                );
                clock.textContent = `${String(
                  Math.floor(seconds / 60),
                ).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
              };

              gsap.to(track, {
                x: () => -distance(),
                ease: "none",
                onUpdate: paint,
                scrollTrigger: {
                  trigger: rail,
                  start: "top top",
                  end: "bottom bottom",
                  scrub: 0.35,
                  invalidateOnRefresh: true,
                },
              });

              /* Once at rest, or the first step is dim until somebody
                 scrolls — `onUpdate` does not fire for a page that has not
                 moved yet. */
              paint();
            } else {
              /* Not enough room to travel. Put it back rather than holding a
                 page still in front of somebody for nothing. */
              stage.classList.remove("is-live");
              track.classList.remove("is-live");
            }
          }

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
            <span className="block h-9 w-9 shrink-0">
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
        className="relative flex min-h-[min(86svh,50rem)] flex-col justify-center overflow-hidden bg-[color:var(--panel-deep)] px-5 pt-24 pb-14 text-primary-foreground md:px-10 lg:px-16"
      >
        {/* The headline has a hole in it.
         *
         * Everything else was a picture *of* the product — a console, a chart,
         * a strip of marks — and all of them had the same fault: they had to
         * be read before they meant anything, in the one place on the page
         * where nobody is reading yet.
         *
         * A blank does not have to be read. It is the oldest device there is
         * for making somebody supply a word themselves, and the word this one
         * wants is the entire pitch: you are about to find out what is
         * missing. The gap sits there for a beat with a red rule under it,
         * long enough for the reader to feel it, and then the word lands in
         * it. Nothing is explained.
         *
         * It is also the only hero idea here that gets *better* the bigger it
         * is set, which is why the type runs to the edges of the page instead
         * of sitting in a centred column. A centred medium headline over a
         * muted grey paragraph is the house style of every tool landing page
         * on the internet, this one included until now. */}
        <div className="relative z-[2] mx-auto w-full max-w-[86rem]">
          <p
            data-hero-secondary
            className="font-mono text-[0.66rem] text-primary-foreground/45 uppercase tracking-[0.2em]"
          >
            Rehearse out loud · three minutes
          </p>

          <h1 className="mt-8 font-display text-[clamp(2.5rem,8.6vw,8.5rem)] leading-[0.92] tracking-[-0.05em] md:mt-10">
            <span data-hero-word className="block">
              Say what you{" "}
              <span
                className="lp-grade"
                data-verdict="ok"
                style={{ animationDelay: "700ms" }}
              >
                know.
              </span>
            </span>
            <span data-hero-word className="mt-1 block md:mt-2">
              See what you{" "}
              {/* The blank and the word occupy the same box, so nothing
                  reflows when the word arrives — a headline that re-wraps
                  mid-animation is a layout shift wearing a costume. */}
              <span className="lp-blank">
                <span aria-hidden="true" className="lp-blank-rule" />
                <span className="lp-blank-word">missed.</span>
              </span>
            </span>
          </h1>

          <div className="mt-10 flex flex-col gap-8 border-white/12 border-t pt-8 md:mt-14 md:flex-row md:items-start md:justify-between md:gap-16">
            <p
              data-hero-secondary
              className="max-w-[32ch] text-[1.05rem] text-primary-foreground/75 leading-relaxed md:text-[1.15rem]"
            >
              You explain it out loud. Every sentence is checked against your
              own material while you are still talking.
            </p>
            <div
              data-hero-secondary
              className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:items-center md:shrink-0"
            >
              <Link
                href="/signup"
                data-gsap-hover
                className="group inline-flex h-13 items-center justify-center gap-4 border border-[var(--accent-solid)] bg-[var(--accent-solid)] px-8 font-medium text-[var(--brand-foreground)]"
              >
                Start explaining
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#live-demo"
                data-gsap-hover
                className="lp-nav-link inline-flex h-13 items-center justify-center px-1 font-medium text-primary-foreground/75"
              >
                Watch it mark a take
              </a>
            </div>
          </div>
        </div>
        <div ref={navSentinelRef} aria-hidden="true" className="h-px w-full" />
      </section>

      {/* The console, one screen down.
       *
       * What used to sit in this slot on other landing pages is a picture of
       * a product: a fixed transcript, a mic button that does nothing, a
       * waveform on a loop. This one runs. That is the whole difference, and
       * it is worth a reader's full attention, which is exactly why it is no
       * longer competing with the headline for it. */}
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
        /* No `overflow-hidden` here. It was left over from an earlier
           horizontal track, and it silently breaks the one below: a
           `position: sticky` element only sticks within its nearest clipping
           ancestor, so with this on the section the stage scrolled straight
           past instead of holding. The clipping the track actually needs is
           on the stage itself, which is allowed — an element may clip its own
           overflow and still stick. */
        className="border-border border-t bg-card py-24 md:py-32"
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
        {/* The three steps, played rather than listed.
         *
         * They were a row of three cards, which is what every product page
         * does with an order of operations, and the order was carried by the
         * numbers alone — 01, 02, 03 — which is a label, not a shape.
         *
         * Here the row is a take, and scrolling scrubs it. The track travels
         * sideways past a fixed head at a third of the screen; a step is dim
         * until it reaches the head, and the moment it crosses, its rule
         * draws itself across the panel and the step lights. The clock under
         * the head runs 00:00 to 03:00 as you go, because that is what the
         * track is: three minutes of somebody talking.
         *
         * So the page's one set-piece is not a carousel with the brakes on.
         * It is the product's own gesture — a recording being played and
         * marked as it passes — done at the scale of the page, in the one
         * section that is about the order things happen in.
         *
         * The horizontal layout lives entirely behind `.is-live`, which only
         * JavaScript adds and only above `lg`. Without it, or with reduced
         * motion, this is the three-column stack it has always been: no
         * overflowing row, no pin, nothing to get stuck in. */}
        <div data-steps-rail className="lp-steps-rail relative mt-16 md:mt-20">
          <div data-steps-stage className="lp-steps-stage">
            <div aria-hidden="true" className="lp-playhead" data-steps-playhead>
              <span className="lp-playhead-clock" data-steps-clock>
                00:00
              </span>
            </div>
            <div
              data-steps-track
              className="lp-steps-track mx-auto grid max-w-[76rem] gap-10 px-5 md:px-8 lg:grid-cols-3 lg:items-start lg:gap-8"
            >
              {steps.map((step, index) => (
                <article
                  key={step.number}
                  data-feature-card
                  data-step
                  className={`lp-step relative border-border border-t pt-7 ${
                    ["", "lg:mt-11", "lg:mt-22"][index]
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="lp-step-rule -top-px absolute left-0 h-[2px] w-16"
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
      <section className="relative overflow-hidden bg-[color:var(--panel-deep)] px-5 pt-28 pb-20 md:px-8 md:pt-36 md:pb-28">
        <SteppedEdge />
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
