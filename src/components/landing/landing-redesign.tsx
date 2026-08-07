"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  Check,
  Lightbulb,
  LockKeyhole,
  Mic,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ExplainaloudMark } from "~/components/explainaloud-mark";

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
    title: "Bring your material",
    body: "Upload notes, slides, or a chapter. Explainaloud builds the course from what you are actually learning.",
  },
  {
    number: "02",
    title: "Say it in your own words",
    body: "Talk for about three minutes. Your explanation is transcribed and checked claim by claim as you speak.",
  },
  {
    number: "03",
    title: "Know what to fix",
    body: "See what was right, what was too vague, and the exact step you skipped—then turn the gaps into a plan.",
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

const marqueeCopy =
  "Upload what you’re learning  ·  Explain it in your own words  ·  See what’s solid  ·  Find what’s missing  ·  ";

function MarqueeRibbon() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-label="How Explainaloud works"
      className="relative h-[12rem] overflow-hidden bg-primary md:h-[15rem]"
    >
      <motion.div
        animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={{
          duration: 38,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
        className="absolute top-0 left-0 flex h-full w-max will-change-transform"
      >
        {["first", "second"].map((copy) => (
          <svg
            key={copy}
            aria-hidden={copy === "second"}
            viewBox="0 0 1600 240"
            className="h-full w-[100rem] shrink-0 overflow-visible"
          >
            <title>{copy === "first" ? "How Explainaloud works" : ""}</title>
            <defs>
              <path
                id={`marquee-curve-${copy}`}
                d="M -80 185 Q 390 18 820 118 T 1680 72"
              />
            </defs>
            <text className="fill-primary-foreground/82 font-display text-[42px] italic tracking-[-0.02em]">
              <textPath href={`#marquee-curve-${copy}`} startOffset="0">
                {marqueeCopy}
              </textPath>
            </text>
          </svg>
        ))}
      </motion.div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/15" />
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

function AhaMoment() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="mt-4 overflow-hidden border border-border bg-card">
      <motion.button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        whileTap={reduceMotion ? undefined : { scale: 0.985 }}
        className="group flex w-full items-center gap-3 p-4 text-left"
      >
        <motion.span
          animate={
            open && !reduceMotion
              ? { rotate: [0, -9, 8, 0], scale: [1, 1.12, 1] }
              : { rotate: 0, scale: 1 }
          }
          transition={
            open
              ? { duration: 0.45, ease }
              : { type: "spring", stiffness: 360, damping: 18 }
          }
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
            open
              ? "bg-[var(--vague)] text-white"
              : "bg-muted text-muted-foreground group-hover:text-foreground"
          }`}
        >
          <Lightbulb className="h-4 w-4" />
        </motion.span>
        <span>
          <span className="block font-semibold text-sm">
            {open ? "That’s the missing idea" : "Find the aha moment"}
          </span>
          <span className="mt-0.5 block text-muted-foreground text-xs">
            {open ? "Click to close" : "Click the bulb to reveal it"}
          </span>
        </span>
        <span className="ml-auto text-muted-foreground text-xl">
          {open ? "×" : "+"}
        </span>
      </motion.button>

      {open && (
        <div className="border-border border-t bg-muted/45 px-4 pt-4 pb-5">
          <p className="font-display text-[1.3rem] text-strong leading-snug">
            The forces act on different objects.
          </p>
          <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
            The wall pushes you while you push the wall, so the pair cannot
            cancel on one object.
          </p>
        </div>
      )}
    </div>
  );
}

function ScrollJourney() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const hitY = useTransform(
    scrollYProgress,
    [0.05, 0.17, 0.3, 0.39],
    [150, 0, 0, -150],
  );
  const hitOpacity = useTransform(
    scrollYProgress,
    [0.05, 0.14, 0.31, 0.39],
    [0, 1, 1, 0],
  );
  const rushedY = useTransform(
    scrollYProgress,
    [0.3, 0.42, 0.54, 0.61],
    [150, 0, 0, -150],
  );
  const rushedOpacity = useTransform(
    scrollYProgress,
    [0.3, 0.39, 0.54, 0.61],
    [0, 1, 1, 0],
  );
  const missedY = useTransform(
    scrollYProgress,
    [0.52, 0.62, 0.84],
    [150, 0, 0],
  );
  const missedOpacity = useTransform(
    scrollYProgress,
    [0.52, 0.6, 0.82],
    [0, 1, 1],
  );

  return (
    <section ref={sectionRef} className="relative h-[230vh] bg-[#ebe6da]">
      <div className="sticky top-0 h-screen overflow-hidden px-5 pt-24 md:px-8 md:pt-28">
        <div className="mx-auto w-full max-w-[76rem]">
          <div className="text-center">
            <p className="font-mono text-[0.67rem] text-brand-ink uppercase tracking-[0.14em]">
              Rehearsal, made visible
            </p>
            <h2 className="mx-auto mt-4 max-w-[15ch] font-display text-[clamp(2.3rem,4.4vw,4.5rem)] text-strong leading-[0.95] tracking-[-0.045em]">
              Watch your explanation become a clear next move.
            </h2>
          </div>

          <div className="relative mx-auto h-[calc(100vh-22rem)] min-h-[20rem] max-w-[58rem]">
            <motion.div
              style={
                reduceMotion ? undefined : { y: hitY, opacity: hitOpacity }
              }
              className="absolute inset-0 flex items-center justify-center"
            >
              <article className="w-full rounded-[2.8rem_2rem_2.7rem_2.2rem] border border-[var(--ok)]/25 bg-card/88 p-7 shadow-[0_32px_80px_-46px_rgba(7,89,79,0.5)] backdrop-blur-2xl md:p-10">
                <div className="flex items-center gap-3 font-mono text-[0.64rem] text-[var(--ok)] uppercase tracking-[0.12em]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--ok)]" />
                  Hit · the rule
                </div>
                <p className="mt-6 max-w-[18ch] font-display text-[clamp(2.2rem,4.5vw,4.5rem)] text-strong leading-[1.02]">
                  “Forces come in pairs, equal and opposite.”
                </p>
                <p className="mt-6 text-muted-foreground">
                  Accurate, clear, and tied to your notes.
                </p>
              </article>
            </motion.div>

            <motion.div
              style={
                reduceMotion
                  ? undefined
                  : { y: rushedY, opacity: rushedOpacity }
              }
              className="absolute inset-0 flex items-center justify-center"
            >
              <article className="w-full rounded-[2rem_2.8rem_2.2rem_2.7rem] border border-[var(--vague)]/25 bg-card/88 p-7 shadow-[0_32px_80px_-46px_rgba(150,96,10,0.35)] backdrop-blur-2xl md:p-10">
                <div className="flex items-center gap-3 font-mono text-[0.64rem] text-[var(--vague)] uppercase tracking-[0.12em]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--vague)]" />
                  Rushed · the why
                </div>
                <p className="mt-6 max-w-[18ch] font-display text-[clamp(2.2rem,4.5vw,4.5rem)] text-strong leading-[1.02] italic">
                  “The wall kind of pushes back.”
                </p>
                <div
                  className="mt-7 flex h-9 items-center gap-1"
                  aria-hidden="true"
                >
                  {waveform.map(({ id, height }, index) => (
                    <motion.span
                      key={id}
                      animate={
                        reduceMotion
                          ? { height }
                          : {
                              height: [height * 0.55, height, height * 0.55],
                              opacity: [0.45, 0.9, 0.45],
                            }
                      }
                      transition={{
                        duration: 2.6,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: index * 0.09,
                        ease: "easeInOut",
                      }}
                      className="w-1 rounded-full bg-[var(--vague)]"
                    />
                  ))}
                </div>
                <p className="mt-5 text-muted-foreground">
                  You said the result, but rushed past the mechanism.
                </p>
              </article>
            </motion.div>

            <motion.div
              style={
                reduceMotion
                  ? undefined
                  : { y: missedY, opacity: missedOpacity }
              }
              className="absolute inset-0 flex items-center justify-center"
            >
              <article className="w-full rounded-[2.7rem_2.1rem_2.9rem_2.2rem] border border-[var(--miss)]/25 bg-primary p-7 text-primary-foreground shadow-[0_36px_90px_-44px_rgba(7,89,79,0.72)] md:p-10">
                <div className="flex items-center gap-3 font-mono text-[0.64rem] text-[var(--miss-light)] uppercase tracking-[0.12em]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--miss-light)]" />
                  Missed · the key point
                </div>
                <p className="mt-6 max-w-[18ch] font-display text-[clamp(2.2rem,4.5vw,4.5rem)] leading-[1.02]">
                  The forces act on different objects.
                </p>
                <p className="mt-6 max-w-[38rem] text-[#d7e7df] leading-relaxed">
                  That is your next rehearsal cue. Say it once more, and connect
                  it directly to why the pair does not cancel.
                </p>
              </article>
            </motion.div>

            <div
              className="absolute top-1/2 -right-3 flex -translate-y-1/2 flex-col gap-2 md:-right-8"
              aria-hidden="true"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--ok)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--vague)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--miss)]" />
            </div>
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
    <motion.section className="relative z-20 rounded-t-[3.5rem] bg-background px-5 pt-16 pb-24 shadow-[0_-24px_60px_-45px_rgba(7,89,79,0.4)] md:px-8 md:pt-20 md:pb-32">
      <div className="mx-auto max-w-[76rem]">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[0.67rem] text-muted-foreground uppercase tracking-[0.14em]">
              See the feedback
            </p>
            <h2 className="mt-5 max-w-[14ch] font-display text-[clamp(2.7rem,5vw,5rem)] text-strong leading-[0.98] tracking-[-0.045em]">
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
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  )}
                  <span
                    className={`relative ${active === index ? "text-[#07594f]" : "text-[#d7e7df]"}`}
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

  return (
    <main className="lp-v2 min-h-screen overflow-x-clip bg-background text-foreground">
      <nav className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-5">
        <div className="mx-auto flex h-16 max-w-[76rem] items-center rounded-[1.8rem_1.35rem_1.7rem_1.45rem] border border-white/60 bg-card/78 px-5 shadow-[0_16px_48px_-28px_rgba(0,40,34,0.55)] backdrop-blur-2xl md:px-7">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label="Explainaloud home"
          >
            <ExplainaloudMark className="h-6 w-6" />
            <span className="font-semibold tracking-[-0.025em]">
              Explainaloud
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm transition-colors hover:bg-muted"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground text-sm transition-opacity hover:opacity-85"
            >
              Start free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-primary px-5 pt-40 pb-20 text-primary-foreground md:px-8 md:pt-48 md:pb-28">
        <motion.div
          aria-hidden="true"
          animate={reduceMotion ? undefined : { x: ["-12%", "12%", "-12%"] }}
          transition={{
            duration: 18,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute top-28 left-1/2 h-px w-[44rem] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
        <div className="mx-auto max-w-[76rem] text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="font-mono text-[0.67rem] text-[#c7ddd5] uppercase tracking-[0.15em]"
          >
            Learn by explaining, not rereading
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.75, ease }}
            className="mx-auto mt-7 max-w-[13ch] font-display text-[clamp(3.5rem,8vw,7.4rem)] text-[#fff9df] leading-[0.93] tracking-[-0.055em]"
          >
            Say what you know.{" "}
            <em className="font-normal">See what you missed.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.7, ease }}
            className="mx-auto mt-7 max-w-[42rem] text-[clamp(1.05rem,2vw,1.3rem)] text-[#d7e7df] leading-relaxed"
          >
            Upload your material, explain it out loud, and get your own words
            back—marked with what was right, vague, or missing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.65, ease }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/signup"
              className="group inline-flex h-12 items-center gap-2 rounded-[1.4rem_1rem_1.4rem_1.1rem] bg-gradient-to-br from-[#eee5f8] to-[#e7efd9] px-6 text-[#173a35] font-medium shadow-[0_12px_30px_-16px_rgba(0,40,34,0.6)] transition-transform hover:scale-[1.025] active:scale-[0.98]"
            >
              Start explaining
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center rounded-[1.2rem] border border-white/30 bg-white/5 px-6 font-medium text-[#fff9df] backdrop-blur-md transition-colors hover:bg-white/10"
            >
              See how it works
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.65 }}
            className="mx-auto mt-8 flex w-fit flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-[1.4rem] border border-white/15 bg-white/7 px-5 py-2.5 font-mono text-[0.62rem] text-[#c7ddd5] uppercase tracking-[0.11em] backdrop-blur-md"
          >
            <motion.span
              aria-hidden="true"
              animate={
                reduceMotion
                  ? undefined
                  : { scale: [0.82, 1.18, 0.82], opacity: [0.45, 1, 0.45] }
              }
              transition={{
                duration: 2.8,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="h-2 w-2 rounded-full bg-[#b9dccb] shadow-[0_0_18px_rgba(185,220,203,0.7)]"
            />
            <span>Upload</span>
            <span className="opacity-45">→</span>
            <span>Explain aloud</span>
            <span className="opacity-45">→</span>
            <span>See the gap</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 34, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.9, ease }}
          className="lp-product-window mx-auto mt-16 max-w-[68rem] overflow-hidden rounded-[3rem_2rem_3.2rem_2.3rem] border border-white/60 bg-card/82 shadow-[0_38px_100px_-50px_rgba(0,40,34,0.5)] backdrop-blur-2xl md:mt-20"
        >
          <div className="flex items-center border-border border-b px-5 py-4">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
            </div>
            <span className="mx-auto -translate-x-5 font-mono text-[0.65rem] text-muted-foreground uppercase tracking-[0.12em]">
              Live explanation · Physics
            </span>
          </div>

          <div className="grid min-h-[31rem] md:grid-cols-[1fr_18rem]">
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
                  type="button"
                  aria-label="Recording example"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
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

            <aside className="border-border border-t bg-muted/55 p-6 text-left md:border-t-0 md:border-l md:p-7">
              <p className="font-mono text-[0.65rem] text-muted-foreground uppercase tracking-[0.12em]">
                What you missed
              </p>
              <div className="mt-6 rounded-2xl border border-miss/20 bg-card p-5 shadow-sm">
                <span className="font-mono text-[0.62rem] text-miss uppercase tracking-[0.12em]">
                  Missing step
                </span>
                <p className="mt-3 font-display text-[1.45rem] text-strong leading-snug">
                  You named the rule, but skipped why the forces do not cancel.
                </p>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  Reveal the idea that completes your explanation.
                </p>
              </div>
              <AhaMoment />
              <div className="mt-4 flex items-center gap-2 text-muted-foreground text-xs">
                <LockKeyhole className="h-3.5 w-3.5" /> Audio is never stored
              </div>
            </aside>
          </div>
        </motion.div>
      </section>

      <MarqueeRibbon />

      <ScrollJourney />

      <FeedbackDemo />

      <section
        id="how-it-works"
        className="border-border border-t bg-card px-5 py-24 md:px-8 md:py-32"
      >
        <div className="mx-auto max-w-[76rem]">
          <motion.p
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="font-mono text-[0.68rem] text-brand-ink uppercase tracking-[0.13em]"
          >
            A better study loop
          </motion.p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <h2 className="max-w-[12ch] font-display text-[clamp(2.8rem,5vw,5rem)] text-strong leading-[0.98] tracking-[-0.045em]">
              Understanding shows up when you speak.
            </h2>
            <div className="border-border border-t">
              {steps.map((step, index) => (
                <motion.article
                  key={step.number}
                  initial={{ opacity: 0, x: 28 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.55 }}
                  transition={{ delay: index * 0.08, duration: 0.55, ease }}
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
            <article className="border-border py-12 pr-0 lg:border-r lg:py-20 lg:pr-16">
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
              <article className="border-border border-b py-10 lg:py-12 lg:pl-14">
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
              <article className="py-10 lg:py-12 lg:pl-14">
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

      <section className="px-5 pb-8 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.75, ease }}
          className="mx-auto max-w-[76rem] rounded-[2.2rem] bg-primary px-6 py-20 text-center text-primary-foreground md:px-12 md:py-28"
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
            className="mx-auto mb-6 flex h-11 w-11 items-center justify-center rounded-full border border-white/20"
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
            className="group mt-9 inline-flex h-12 items-center gap-2 rounded-full bg-card px-6 text-card-foreground font-medium transition-transform hover:scale-[1.025] active:scale-[0.98]"
          >
            Start free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="mt-5 text-sm opacity-60">
            No audio stored. Free to start.
          </p>
        </motion.div>
      </section>

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
