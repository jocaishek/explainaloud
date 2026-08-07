"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
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
import { type CSSProperties, useEffect, useRef, useState } from "react";
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
  "I covered the customer problem clearly, explained why it matters, and connected the plan to next quarter.  ·  The timeline is ready, the owners are aligned, and the final risk is still waiting on legal.  ·  ";

const trackingWave = [
  { id: "track-a", height: 18 },
  { id: "track-b", height: 30 },
  { id: "track-c", height: 22 },
  { id: "track-d", height: 42 },
  { id: "track-e", height: 27 },
  { id: "track-f", height: 50 },
  { id: "track-g", height: 34 },
  { id: "track-h", height: 56 },
  { id: "track-i", height: 38 },
  { id: "track-j", height: 48 },
  { id: "track-k", height: 25 },
  { id: "track-l", height: 40 },
  { id: "track-m", height: 20 },
];

const liveResults = [
  { label: "Reached: customer problem", color: "var(--ok)" },
  { label: "Too thin: evidence", color: "var(--vague)" },
  { label: "Missed: final risk", color: "var(--miss)" },
] as const;

function MarqueeRibbon() {
  const reduceMotion = useReducedMotion();
  const [resultIndex, setResultIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = window.setInterval(() => {
      setResultIndex((current) => (current + 1) % liveResults.length);
    }, 3200);
    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  const activeResult = liveResults[resultIndex];

  return (
    <section
      aria-label="How Explainaloud works"
      className="relative h-full overflow-hidden"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        <defs>
          <path
            id="continuous-speech-path"
            d="M -120 520 C 20 520 0 180 220 170 C 410 160 455 390 350 535 C 250 675 130 660 40 590 C 200 720 410 770 650 774 C 674 774 696 774 720 774 L 880 774 C 1070 774 1210 726 1370 714 C 1470 706 1560 720 1720 748"
          >
            {!reduceMotion && (
              <animate
                attributeName="d"
                dur="16s"
                repeatCount="indefinite"
                values="M -120 520 C 20 520 0 180 220 170 C 410 160 455 390 350 535 C 250 675 130 660 40 590 C 200 720 410 770 650 774 C 674 774 696 774 720 774 L 880 774 C 1070 774 1210 726 1370 714 C 1470 706 1560 720 1720 748;M -120 520 C 20 510 6 190 224 176 C 402 164 463 380 356 531 C 258 665 134 666 40 590 C 200 714 410 764 650 774 C 674 774 696 774 720 774 L 880 774 C 1070 774 1210 718 1370 708 C 1470 702 1560 718 1720 748;M -120 520 C 20 520 0 180 220 170 C 410 160 455 390 350 535 C 250 675 130 660 40 590 C 200 720 410 770 650 774 C 674 774 696 774 720 774 L 880 774 C 1070 774 1210 726 1370 714 C 1470 706 1560 720 1720 748"
              />
            )}
          </path>
        </defs>
        <text className="fill-primary-foreground/80 font-sans font-medium text-[18px] tracking-normal">
          <motion.textPath
            href="#continuous-speech-path"
            animate={reduceMotion ? undefined : { startOffset: ["-55%", "0%"] }}
            transition={{
              duration: 42,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          >
            {marqueeCopy.repeat(5)}
          </motion.textPath>
        </text>
      </svg>
      <motion.div
        animate={
          reduceMotion ? undefined : { y: [0, -3, 0], scale: [1, 1.012, 1] }
        }
        transition={{
          duration: 5.8,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="absolute top-[86%] left-1/2 z-10 flex h-[5.5rem] w-[min(44vw,10.5rem)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2.8rem_2.45rem_2.9rem_2.55rem] border-[3px] border-strong bg-primary-foreground px-4 shadow-[0_18px_45px_-22px_rgba(0,20,17,0.72)]"
      >
        <div
          className="absolute -top-12 left-1/2 flex min-w-max -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 font-semibold text-sm text-white shadow-[0_12px_28px_-16px_rgba(0,20,17,0.7)]"
          style={{ backgroundColor: activeResult.color }}
        >
          <span className="h-2 w-2 rounded-full bg-white/80" />
          {activeResult.label}
        </div>

        <div
          role="img"
          aria-label="Live speech waveform showing reached, thin, and missed points"
          className="flex h-16 items-center justify-center gap-1.5"
        >
          {trackingWave.map(({ id, height }, index) => (
            <motion.span
              key={id}
              animate={
                reduceMotion
                  ? { height, opacity: 0.9 }
                  : {
                      height: [height * 0.42, height * 0.78, height * 0.54],
                      opacity: [0.62, 1, 0.78],
                    }
              }
              transition={{
                duration: 2.7 + (index % 4) * 0.24,
                repeat: Number.POSITIVE_INFINITY,
                delay: index * 0.11,
                ease: "easeInOut",
              }}
              className="w-1 rounded-full bg-strong"
            />
          ))}
        </div>
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
  const [activeStage, setActiveStage] = useState(0);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const nextStage = latest < 0.34 ? 0 : latest < 0.67 ? 1 : 2;
    setActiveStage((current) => (current === nextStage ? current : nextStage));
  });

  const stages = [
    {
      label: "Reached",
      eyebrow: "Hit · the point",
      quote: "We grew qualified leads by 24% this quarter.",
      note: "Clear, specific, and matched to your intended talking point.",
      detail:
        "Explainaloud checks off the point the moment your meaning lands.",
      color: "var(--ok)",
      surface: "bg-[var(--ok-light)]",
    },
    {
      label: "Too thin",
      eyebrow: "Rushed · needs support",
      quote: "The launch went pretty well overall.",
      note: "You touched the point, but did not give the evidence you planned.",
      detail: "Amber means you said it, but too thinly to count as complete.",
      color: "var(--vague)",
      surface: "bg-[var(--vague-light)]",
    },
    {
      label: "Missed",
      eyebrow: "Missed · next rehearsal cue",
      quote: "Explain how the customer handoff will work.",
      note: "This key point never appeared in your rehearsal.",
      detail: "Red turns the omission into a precise prompt for your next run.",
      color: "var(--miss)",
      surface: "bg-[var(--miss-light)]",
    },
  ] as const;
  const stage = stages[activeStage];

  return (
    <section ref={sectionRef} className="relative h-[260vh] bg-background">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden px-5 pt-20 md:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(113,214,154,0.18),transparent_30%),radial-gradient(circle_at_82%_78%,rgba(255,140,131,0.12),transparent_34%)]"
        />
        <motion.div
          aria-hidden="true"
          animate={
            reduceMotion
              ? undefined
              : { rotate: [-7, 5, -7], scale: [1, 1.05, 1] }
          }
          transition={{
            duration: 22,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="absolute -right-[12rem] -bottom-[15rem] h-[31rem] w-[50rem] rounded-[50%] border-[4.5rem] border-[var(--miss)]/7"
        />
        <div className="relative mx-auto grid w-full max-w-[72rem] gap-7 lg:grid-cols-[10rem_34rem_minmax(14rem,1fr)] lg:items-center">
          <div className="hidden space-y-2 lg:block">
            {stages.map((item, index) => (
              <div
                key={item.label}
                className={`border-l-4 py-3 pl-5 font-display text-2xl ${
                  index === activeStage
                    ? "border-[var(--stage-color)] text-strong"
                    : "border-border text-muted-foreground/55"
                }`}
                style={{ "--stage-color": item.color } as CSSProperties}
              >
                {item.label}
              </div>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-[2.6rem_2rem_2.8rem_2.2rem] bg-primary p-4 shadow-[0_34px_90px_-44px_rgba(7,89,79,0.65)] md:p-6">
            <div className="flex items-center justify-between font-mono text-[0.62rem] text-primary-foreground/75 uppercase tracking-[0.12em]">
              <span>Live rehearsal · 01:42</span>
              <span>{activeStage + 1} / 3</span>
            </div>
            <div
              className={`mt-5 flex min-h-[20rem] flex-col rounded-[2.1rem_1.65rem_2.3rem_1.8rem] p-7 text-card-foreground md:p-9 ${stage.surface}`}
            >
              <div
                className="flex items-center gap-3 font-mono text-[0.64rem] uppercase tracking-[0.12em]"
                style={{ color: stage.color }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                {stage.eyebrow}
              </div>
              <p className="mt-7 max-w-full font-display text-[clamp(2.1rem,3.35vw,3.45rem)] leading-[0.98] tracking-[-0.035em]">
                {stage.quote}
              </p>
              <p className="mt-auto max-w-[30rem] pt-7 text-foreground/70 leading-relaxed">
                {stage.note}
              </p>
            </div>
          </div>

          <div className="lg:pl-4">
            <p
              className="font-mono text-[0.65rem] uppercase tracking-[0.14em]"
              style={{ color: stage.color }}
            >
              Rehearsal, made visible
            </p>
            <h2 className="mt-5 font-display text-[clamp(2.35rem,3.5vw,3.8rem)] text-strong leading-[0.98] tracking-[-0.04em]">
              Your points update as you speak.
            </h2>
            <p className="mt-6 text-muted-foreground leading-relaxed">
              {stage.detail}
            </p>
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

      <section className="relative overflow-hidden bg-primary px-5 pb-20 text-primary-foreground md:px-8 md:pb-28">
        <div className="relative min-h-screen pt-24 md:pt-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(113,214,154,0.2),transparent_27%),radial-gradient(circle_at_88%_34%,rgba(255,140,131,0.14),transparent_31%)]"
          />
          <motion.div
            aria-hidden="true"
            animate={
              reduceMotion
                ? undefined
                : { x: ["-3%", "3%", "-3%"], scale: [1, 1.025, 1] }
            }
            transition={{
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute top-[16%] left-1/2 -translate-x-1/2 whitespace-nowrap font-black text-[clamp(7rem,18vw,18rem)] text-white/[0.035] uppercase leading-none tracking-[-0.08em]"
          >
            Explainaloud
          </motion.div>
          <motion.div
            aria-hidden="true"
            animate={
              reduceMotion
                ? undefined
                : { rotate: [12, 18, 12], scale: [1, 1.06, 1] }
            }
            transition={{
              duration: 24,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute -top-[14rem] -left-[18rem] h-[38rem] w-[55rem] rounded-[50%] border-[5rem] border-[var(--miss-light)]/8"
          />
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
          <div className="relative z-10 mx-auto max-w-[76rem] text-center">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="font-mono text-[0.67rem] text-primary-foreground/75 uppercase tracking-[0.15em]"
            >
              Rehearse anything you have to say out loud
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.75, ease }}
              className="mx-auto mt-4 max-w-[15ch] font-display text-[clamp(3.1rem,5.5vw,5.2rem)] text-primary-foreground leading-[0.92] tracking-[-0.055em]"
            >
              Say what you know.{" "}
              <em className="font-normal">See what you missed.</em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.7, ease }}
              className="mx-auto mt-5 max-w-[42rem] text-[clamp(1rem,1.7vw,1.2rem)] text-primary-foreground/85 leading-relaxed"
            >
              Bring the points you intend to make, talk them through naturally,
              and see what you reached, rushed, or never got to.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24, duration: 0.65, ease }}
              className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                href="/signup"
                className="group inline-flex h-12 items-center gap-2 rounded-[1.4rem_1rem_1.4rem_1.1rem] bg-card px-6 text-card-foreground font-medium shadow-[0_12px_30px_-16px_rgba(0,40,34,0.6)] transition-transform hover:scale-[1.025] active:scale-[0.98]"
              >
                Start explaining
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center rounded-[1.2rem] border border-white/30 bg-white/5 px-6 font-medium text-primary-foreground backdrop-blur-md transition-colors hover:bg-white/10"
              >
                See how it works
              </a>
            </motion.div>
          </div>

          <div className="pointer-events-none absolute inset-0">
            <MarqueeRibbon />
          </div>
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
