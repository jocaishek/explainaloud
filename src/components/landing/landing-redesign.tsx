"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Leaf,
  LockKeyhole,
  MessageCircle,
  Mic,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ExplainaloudMark } from "~/components/explainaloud-mark";
import { GlassMark } from "~/components/landing/glass-mark";

const transcript = [
  { text: "Newton’s third law says forces come in pairs, ", tone: "plain" },
  { text: "equal and opposite", tone: "ok" },
  { text: ". When I push the wall, it ", tone: "plain" },
  { text: "kind of pushes back", tone: "vague" },
  { text: ".", tone: "plain" },
] as const;

const steps = [
  {
    number: "01",
    title: "Bring your talk or your material",
    body: "Upload slides and speaker notes for a presentation, or notes and a chapter for a subject. Explainaloud pulls out the key points you are meant to hit.",
  },
  {
    number: "02",
    title: "Say it in your own words",
    body: "Talk for about three minutes, with nothing to read off. Your explanation is transcribed and checked against those points claim by claim, as you speak.",
  },
  {
    number: "03",
    title: "Know exactly what to fix",
    body: "See what landed, what was too thin to count, and the point you never reached—then run it again with those in front of you.",
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
    body: "Picking the right option means you can spot the answer when it is in front of you. It says nothing about whether you could produce it with nobody prompting you.",
  },
  {
    title: "Gaps only show when you speak",
    body: "Reading your notes again finds nothing wrong, because the page supplies every step. The missing one appears the moment you have to say it in order.",
  },
  {
    title: "Marked against your material",
    body: "Not a topic name and a generic question bank. The points come out of the file you uploaded, so the feedback answers to what you are actually responsible for.",
  },
] as const;

const ease = [0.23, 1, 0.32, 1] as const;

/* Matches the hero: a ground, not a picture. The page opens dark, goes light
 * for the product, and comes back dark to close — one crossing each way, which
 * is what `design.md` allows, and the dark now means "this is the end" rather
 * than "here is another photograph". */
const closingFieldStyle: CSSProperties = {
  backgroundImage:
    "radial-gradient(110% 80% at 30% 20%, rgba(27, 62, 116, 0.5), transparent 60%), linear-gradient(160deg, #0e2549 0%, #0a1c3a 48%, #061227 100%)",
};

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
          {waveform.map(({ id, height }, index) => (
            <motion.span
              key={id}
              animate={
                reduceMotion
                  ? { height: Math.max(5, height * 0.62) }
                  : {
                      height: [
                        Math.max(5, height * 0.42),
                        Math.max(8, height * 0.82),
                        Math.max(5, height * 0.5),
                      ],
                    }
              }
              transition={{
                duration: 1.35 + index * 0.04,
                repeat: Number.POSITIVE_INFINITY,
                delay: index * 0.055,
                ease: "easeInOut",
              }}
              className="w-1 rounded-full bg-[var(--ok-light)]"
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

const feedback = [
  {
    id: "correct",
    label: "Correct",
    eyebrow: "Strong claim",
    quote: "Forces come in pairs, equal and opposite.",
    note: "Accurate and stated clearly.",
    color: "var(--ok)",
    light: "var(--ok-light)",
  },
  {
    id: "vague",
    label: "Vague",
    eyebrow: "Needs precision",
    quote: "The wall kind of pushes back.",
    note: "Name the force and which object it acts on.",
    color: "var(--vague)",
    light: "var(--vague-light)",
  },
  {
    id: "missing",
    label: "Missing",
    eyebrow: "The key mechanism",
    quote: "The two forces act on different objects.",
    note: "That is why the force pair does not cancel itself out.",
    color: "var(--miss)",
    light: "var(--miss-light)",
  },
] as const;

function IntroPanel() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="fixed right-5 bottom-5 z-[80] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 25 }}
            className="w-[min(21rem,calc(100vw-2.5rem))] border border-white/15 bg-[var(--panel-deep)] p-5 text-left text-primary-foreground shadow-[6px_6px_0_rgba(6,18,38,0.72)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ok)] text-white">
                <Leaf className="h-4 w-4" />
              </span>
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--ok-light)]">
                  Start here
                </p>
                <p className="mt-2 font-semibold leading-snug">
                  What do you need to say clearly today?
                </p>
              </div>
            </div>
            <p className="mt-4 text-primary-foreground/68 text-sm leading-relaxed">
              Bring your notes and talk through them once. We’ll show what
              landed, what felt thin, and what never made it out.
            </p>
            <Link
              href="/signup"
              data-gsap-hover
              className="mt-5 inline-flex h-10 items-center gap-3 bg-card px-4 font-medium text-card-foreground text-sm"
            >
              Start a rehearsal <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.aside>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        data-gsap-hover
        aria-label={open ? "Close the intro panel" : "What is Explainaloud?"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        whileTap={reduceMotion ? undefined : { scale: 0.9 }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-[var(--panel-deep)] text-primary-foreground shadow-[4px_4px_0_rgba(6,18,38,0.78)]"
      >
        {!reduceMotion && (
          <motion.span
            aria-hidden="true"
            animate={{ scale: [1, 1.42, 1], opacity: [0.42, 0, 0.42] }}
            transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY }}
            className="absolute inset-0 rounded-full border border-[var(--ok-light)]"
          />
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "chat"}
            initial={{ rotate: -20, scale: 0.7, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 20, scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {open ? (
              <X className="h-5 w-5" />
            ) : (
              <MessageCircle className="h-5 w-5" />
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

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
      note: "Clear, specific, and matched to your intended talking point.",
      detail:
        "Explainaloud checks off the point the moment your meaning lands.",
      color: "var(--ok)",
      surface: "bg-[var(--panel-deep)]",
    },
    {
      label: "Too thin",
      eyebrow: "Rushed · needs support",
      quote: "The launch went pretty well overall.",
      note: "You touched the point, but did not give the evidence you planned.",
      detail: "Amber means you said it, but too thinly to count as complete.",
      color: "var(--vague)",
      surface: "bg-[var(--panel-deep)]",
    },
    {
      label: "Missed",
      eyebrow: "Missed · next rehearsal cue",
      quote: "Explain how the customer handoff will work.",
      note: "This key point never appeared in your rehearsal.",
      detail: "Red turns the omission into a precise prompt for your next run.",
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
                  <p className="mt-7 font-display text-[clamp(1.9rem,3vw,2.9rem)] text-white leading-[1.08] tracking-[-0.03em]">
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
          <h2 className="mt-5 font-display text-[clamp(2.2rem,3.4vw,3.4rem)] text-strong leading-[1.02] tracking-[-0.04em]">
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

function FeedbackDemo() {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const item = feedback[active];

  return (
    <motion.section
      id="feedback"
      className="relative z-20 border-white/10 border-t bg-background px-5 pt-16 pb-24 md:px-8 md:pt-20 md:pb-32"
    >
      <div data-scroll-reveal className="mx-auto max-w-[76rem]">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[0.67rem] text-muted-foreground uppercase tracking-[0.14em]">
              See the feedback
            </p>
            <h2 className="mt-5 max-w-[16ch] font-display text-[clamp(2.5rem,4.6vw,4.4rem)] text-strong leading-[1] tracking-[-0.04em]">
              One explanation. Three useful answers.
            </h2>
          </div>
          <p className="max-w-[30rem] text-muted-foreground leading-relaxed md:pb-1">
            Explainaloud does not hand you a mysterious score. It shows the
            exact sentence that worked, the one that needs precision, and the
            idea you skipped.
          </p>
        </div>

        <div className="grid overflow-hidden border border-border bg-card lg:grid-cols-[0.82fr_1.18fr]">
          <div className="border-border border-b p-6 md:p-10 lg:border-r lg:border-b-0 lg:p-12">
            <p className="font-mono text-[0.65rem] text-muted-foreground uppercase tracking-[0.12em]">
              Your explanation · 00:17
            </p>
            <p className="mt-10 font-display text-[clamp(2rem,3.8vw,3.7rem)] text-strong leading-[1.1] tracking-[-0.035em]">
              “Newton’s third law says forces come in pairs, equal and opposite.
              When I push the wall, it kind of pushes back.”
            </p>
            <div className="mt-12 flex items-center gap-3 text-muted-foreground text-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Check className="h-4 w-4" />
              </span>
              Transcribed and checked in real time
            </div>
          </div>

          <div className="bg-primary p-6 text-primary-foreground md:p-10 lg:p-12">
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Feedback examples"
            >
              {feedback.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={active === index}
                  onClick={() => setActive(index)}
                  className="relative overflow-hidden border border-white/20 px-4 py-2.5 font-mono text-[0.64rem] uppercase tracking-[0.1em] transition-colors hover:border-white/45"
                >
                  {active === index && (
                    <motion.span
                      layoutId="feedback-tab"
                      className="absolute inset-0 bg-white"
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  <span
                    className={`relative ${active === index ? "text-primary" : "text-primary-foreground/85"}`}
                  >
                    {option.label}
                  </span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={item.id}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
                transition={{ duration: 0.38, ease }}
                className="mt-14"
              >
                <div className="flex items-center gap-3">
                  <motion.span
                    initial={reduceMotion ? false : { scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.light }}
                  />
                  <span
                    className="font-mono text-[0.65rem] uppercase tracking-[0.13em]"
                    style={{ color: item.light }}
                  >
                    {item.eyebrow}
                  </span>
                </div>
                <p className="mt-7 max-w-[15ch] font-display text-[clamp(2.5rem,4.7vw,4.8rem)] leading-[0.98] tracking-[-0.04em]">
                  {item.quote}
                </p>
                <motion.div
                  initial={reduceMotion ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.12, duration: 0.55, ease }}
                  className="mt-9 h-px origin-left"
                  style={{ backgroundColor: item.color }}
                />
                <p className="mt-5 max-w-[32rem] text-white/60 leading-relaxed">
                  {item.note}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

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
  useEffect(() => {
    const sentinel = navSentinelRef.current;
    const nav = navRef.current;
    if (!sentinel || !nav) return;

    let frame = 0;
    const sync = () => {
      frame = 0;
      nav.classList.toggle(
        "is-light",
        sentinel.getBoundingClientRect().top <= 64,
      );
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(sync);
    };

    sync();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
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

          if (!reduceMotion) {
            /* The mark turns because the reader scrolls, not on a clock of its
               own. A logo rotating by itself is a loading spinner, which is
               the one thing an identity mark must never be mistaken for; the
               same rotation tied to scroll is an object the reader is moving
               around, which is the point.
               
               Same trigger window as the tween that flies it into the nav, so
               the turn and the docking are one gesture: it spins up out of the
               page and lands as the wordmark. */
            gsap.to("#bg-logo-spin", {
              /* Exactly one turn, not 460 degrees. The mark has to come to
                 rest face-on, because where it comes to rest is the nav bar —
                 and 460 left it sitting at 100 degrees, which is a wordmark
                 turned nearly edge-on for the whole rest of the page. Any
                 multiple of 360 is safe; nothing else is. */
              rotationY: 360,
              ease: "none",
              transformOrigin: "50% 50%",
              scrollTrigger: {
                trigger: "#hero",
                start: "top top",
                end: "48% top",
                scrub: 0.8,
                invalidateOnRefresh: true,
              },
            });
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
          gsap.utils
            .toArray<HTMLElement>("[data-scroll-reveal]")
            .forEach((element) => {
              reveals.push(
                gsap.from(element, {
                  y: 56,
                  opacity: 0,
                  duration: 0.9,
                  ease: "power3.out",
                  scrollTrigger: {
                    trigger: element,
                    start: "top 85%",
                    toggleActions: "play none none reverse",
                  },
                }),
              );
            });

          reveals.push(
            gsap.from(".lp-product-window", {
              y: 120,
              scale: 0.92,
              opacity: 0,
              duration: 1.15,
              ease: "power3.out",
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
              reveals.push(
                gsap.from(element, {
                  x: index % 2 === 0 ? -60 : 60,
                  opacity: 0,
                  duration: 1,
                  ease: "power3.out",
                  scrollTrigger: {
                    trigger: element,
                    start: "top 86%",
                    toggleActions: "play none none reverse",
                  },
                }),
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
        <div className="mx-auto grid h-16 max-w-[76rem] grid-cols-[1fr_auto_1fr] items-center px-5 md:px-8">
          <div className="hidden items-center gap-5 text-[0.78rem] lg:flex">
            <a href="#live-demo" className="lp-nav-link">
              Live demo
            </a>
            <a href="#results" className="lp-nav-link">
              Results
            </a>
            <a href="#feedback" className="lp-nav-link">
              Feedback
            </a>
            <a href="#how-it-works" className="lp-nav-link">
              How it works
            </a>
          </div>
          <Link
            href="/"
            className="lp-nav-brand flex h-8 items-center justify-center gap-2.5 whitespace-nowrap text-primary-foreground sm:min-w-44"
            aria-label="Explainaloud home"
          >
            <span className="lp-nav-brand-copy font-sans font-semibold text-sm tracking-[-0.02em]">
              Explainaloud
            </span>
            <ExplainaloudMark className="h-6 w-6 shrink-0" />
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
        <div
          aria-hidden="true"
          className="lp-hero-scrim absolute inset-0 z-[1]"
        />

        {/* Absolute, and inside the hero, which already clips its overflow.
            A fixed ornament at the document root can always end up over
            content — this one did, for the whole page. An absolute one in a
            clipped section cannot reach past it. */}
        <div
          id="bg-logo"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-[62%] z-[1] hidden h-[clamp(8rem,13vw,12rem)] w-[clamp(8rem,13vw,12rem)] -translate-y-1/2 text-[length:clamp(8rem,13vw,12rem)] opacity-45 [perspective:900px] will-change-transform lg:block"
        >
          {/* The spin is on its own element so nothing else is competing for
              the same transform. */}
          <div
            id="bg-logo-spin"
            className="h-full w-full will-change-transform"
            style={{ transformStyle: "preserve-3d" }}
          >
            <GlassMark className="h-full w-full" />
          </div>
        </div>
        <div className="relative z-[2] flex min-h-screen flex-col pt-20 md:pt-24">
          <div className="relative z-10 mx-auto flex w-full max-w-[76rem] flex-1 flex-col items-center justify-center py-8 text-center lg:items-start lg:text-left">
            <h1 className="relative mx-auto max-w-[12ch] font-display lg:mx-0 lg:max-w-[11ch] text-[clamp(2.9rem,5.4vw,5.4rem)] text-primary-foreground leading-[0.92] tracking-[-0.055em]">
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
                <span data-hero-word className="inline-block">
                  know.
                </span>{" "}
                <span
                  data-hero-word
                  className="inline-block text-[var(--accent-solid)] italic"
                >
                  See
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.08em]">
                <span
                  data-hero-word
                  className="inline-block text-[var(--accent-solid)] italic"
                >
                  what you missed.
                </span>
              </span>
            </h1>

            <p
              data-hero-secondary
              className="mt-6 max-w-[36rem] text-primary-foreground/85 text-[1.05rem] leading-relaxed lg:max-w-[30rem]"
            >
              Upload your slides or your notes. Explain them out loud for three
              minutes. Explainaloud marks what you said against the material —
              sentence by sentence — and shows you the point you never reached.
            </p>

            <motion.div
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
            </motion.div>
          </div>

          <div className="relative z-10 pb-24 md:pb-28">
            <LiveRehearsalPanel />
          </div>
        </div>
        <div ref={navSentinelRef} aria-hidden="true" className="h-px w-full" />
      </section>

      <section
        id="live-demo"
        className="bg-background px-5 pt-16 pb-20 md:px-8 md:pt-20 md:pb-28"
      >
        <motion.div
          data-story-section
          data-gsap-lock
          data-gsap-hover
          className="lp-product-window mx-auto max-w-[68rem] overflow-hidden rounded-[20px] border border-border bg-card"
        >
          <div
            data-story-step
            className="border-border border-b px-6 py-4 md:px-10 lg:px-12"
          >
            <span className="font-mono text-[0.65rem] text-muted-foreground uppercase tracking-[0.12em]">
              You are explaining · Physics
            </span>
          </div>

          <div
            data-story-step
            className="grid min-h-[31rem] md:grid-cols-[1fr_18rem]"
          >
            <div className="flex flex-col p-6 text-left md:p-10 lg:p-12">
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 font-mono text-[0.68rem] text-muted-foreground uppercase tracking-[0.11em]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-miss opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-miss" />
                  </span>
                  Recording · 00:17
                </span>
                <span className="text-muted-foreground text-sm">128 wpm</span>
              </div>

              <p className="mt-12 max-w-[32ch] font-display text-[clamp(1.8rem,3.7vw,3.2rem)] text-strong leading-[1.18] tracking-[-0.025em]">
                {transcript.map((run) => (
                  <span
                    key={run.text}
                    className={
                      run.tone === "plain"
                        ? undefined
                        : `lp-verdict-${run.tone}`
                    }
                  >
                    {run.text}
                  </span>
                ))}
                <span className="ml-1 inline-block h-[0.9em] w-[2px] translate-y-[0.08em] animate-pulse bg-brand-deep" />
              </p>

              <div className="mt-auto flex items-center gap-3 pt-12">
                <motion.button
                  data-gsap-hover
                  type="button"
                  aria-label="Recording example"
                  whileTap={{ scale: 0.94 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <Mic className="h-5 w-5" />
                </motion.button>
                <div
                  className="flex h-10 items-center gap-1"
                  aria-hidden="true"
                >
                  {waveform.map(({ id, height }, index) => (
                    <motion.span
                      key={id}
                      animate={
                        reduceMotion
                          ? { height }
                          : {
                              height: [
                                height,
                                Math.max(8, height * 0.55),
                                height,
                              ],
                            }
                      }
                      transition={{
                        duration: 2.6,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: index * 0.11,
                        ease: "easeInOut",
                      }}
                      className="w-1 rounded-full bg-brand-deep/65"
                    />
                  ))}
                </div>
              </div>
            </div>

            <aside className="border-border border-t bg-muted p-6 text-left md:border-t-0 md:border-l md:p-7">
              <p className="font-mono text-[0.65rem] text-brand-ink uppercase tracking-[0.12em]">
                Do this next
              </p>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                While you talk, this column fills with the one thing worth
                fixing before your next run.
              </p>
              <div
                data-gsap-hover
                className="mt-6 rounded-sm border border-white/10 border-l-2 border-l-miss bg-[var(--panel-deep)] p-5 shadow-[4px_4px_0_rgba(6,18,38,0.7)]"
              >
                {/* The lit tint, not the fill. `--miss` is tuned to be read on
                    stock; on the deep panel it lands near 3:1 and the label
                    reads as a smudge. */}
                <span className="font-mono text-[0.62rem] text-[var(--miss-light)] uppercase tracking-[0.12em]">
                  Missing step
                </span>
                <p className="mt-3 font-display text-[1.45rem] text-primary-foreground leading-snug">
                  You named the rule, but skipped why the forces do not cancel.
                </p>
                <p className="mt-3 text-primary-foreground/65 text-sm leading-relaxed">
                  Reveal the idea that completes your explanation.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-muted-foreground text-xs">
                <LockKeyhole className="h-3.5 w-3.5" /> Audio is never stored
              </div>
            </aside>
          </div>
        </motion.div>
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
          <h2 className="mt-5 max-w-[20ch] font-display text-[clamp(2.1rem,4vw,3.6rem)] text-strong leading-[1.02] tracking-[-0.04em]">
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

      <FeedbackDemo />

      <section
        id="how-it-works"
        data-story-section
        data-scroll-reveal
        className="border-border border-t bg-card px-5 py-24 md:px-8 md:py-32"
      >
        <div className="mx-auto max-w-[76rem]">
          <motion.p
            data-story-step
            className="font-mono text-[0.68rem] text-brand-ink uppercase tracking-[0.13em]"
          >
            Rehearse it, or learn it
          </motion.p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div data-story-step>
              <h2 className="max-w-[12ch] font-display text-[clamp(2.6rem,4.6vw,4.6rem)] text-strong leading-[1] tracking-[-0.04em]">
                Understanding shows up when you speak.
              </h2>
              <p className="mt-7 max-w-[34rem] text-muted-foreground leading-relaxed">
                Richard Feynman&rsquo;s method for learning anything was to
                explain it plainly, out loud, and watch for the place you get
                stuck—because that is the part you did not really have. It is
                the same test a talk fails on stage. Explainaloud runs it for
                you before either one costs you anything.
              </p>
            </div>
            <div className="border-border border-t">
              {steps.map((step) => (
                <motion.article
                  key={step.number}
                  data-story-step
                  data-feature-card
                  className="grid gap-4 border-border border-b py-7 sm:grid-cols-[4rem_0.7fr_1fr] sm:items-start"
                >
                  <span className="font-mono text-[0.67rem] text-muted-foreground">
                    {step.number}
                  </span>
                  <h3 className="font-semibold text-strong text-xl tracking-[-0.025em]">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.body}
                  </p>
                </motion.article>
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
              <h2 className="mt-6 max-w-[13ch] font-display text-[clamp(2.7rem,5vw,5rem)] text-strong leading-[0.98] tracking-[-0.045em]">
                Not another quiz generated from a topic name.
              </h2>
              <p className="mt-7 max-w-[38rem] text-[1.08rem] text-muted-foreground leading-relaxed">
                Every course begins with what you upload. Its claims stay tied
                to exact quotes from your files, so the feedback answers to the
                material you are actually responsible for learning.
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
                  Your words become correct, vague, or incomplete in real
                  time—not as a score waiting on another screen.
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
                  Thinking pauses come out of the calculation. The number
                  reflects how you speak, not how everyone else does.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section
        className="lp-closing-forest px-5 py-20 md:px-8 md:py-28"
        style={closingFieldStyle}
      >
        <motion.div
          data-scroll-reveal
          className="mx-auto max-w-[68rem] border border-white/15 bg-[var(--panel-deep)] px-6 py-20 text-left text-primary-foreground shadow-[6px_6px_0_rgba(4,14,32,0.55)] md:px-12 md:py-28"
        >
          <motion.span
            animate={
              reduceMotion
                ? undefined
                : { rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] }
            }
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="mx-auto mb-6 flex h-11 w-11 items-center justify-center rounded-full border border-white/25"
          >
            <Sparkles className="h-4 w-4" />
          </motion.span>
          <p className="font-mono text-[0.67rem] uppercase tracking-[0.13em] opacity-60">
            Know before it matters
          </p>
          <h2 className="mx-auto mt-5 max-w-[11ch] font-display text-[clamp(3rem,6vw,5.8rem)] leading-[0.95] tracking-[-0.05em]">
            Turn “I think I know it” into certainty.
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
        </motion.div>
      </section>

      <IntroPanel />

      <footer className="mx-auto flex max-w-[76rem] flex-wrap items-center gap-5 px-5 py-8 text-muted-foreground text-sm md:px-8">
        <span className="flex items-center gap-2 text-foreground">
          <ExplainaloudMark className="h-5 w-5" /> Explainaloud
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
