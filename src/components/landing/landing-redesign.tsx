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
  Leaf,
  Lightbulb,
  LockKeyhole,
  MessageCircle,
  Mic,
  Sparkles,
  X,
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

const closingForestStyle: CSSProperties = {
  backgroundImage:
    'linear-gradient(180deg, rgba(5, 31, 22, 0.48), rgba(3, 23, 16, 0.72)), url("/landing/explainaloud-forest-v1.jpg")',
  backgroundPosition: "center 72%",
  backgroundSize: "cover",
  backgroundAttachment: "fixed",
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
      aria-label="Live voice recording preview"
      className="absolute inset-x-0 bottom-5 mx-auto w-[min(44rem,calc(100%_-_1.5rem))] border border-white/20 bg-[var(--panel-deep)] text-primary-foreground shadow-[5px_6px_0_rgba(3,20,14,0.72)]"
    >
      <div className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--miss)] text-white">
          <span className="absolute inset-0 animate-ping rounded-full border border-white/35 opacity-40" />
          <Mic className="relative h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.15em]">
              Recording
            </span>
            <span className="font-mono text-[0.62rem] text-primary-foreground/60 tracking-[0.12em]">
              00:17
            </span>
          </div>
          <div
            className="mt-2 flex h-8 items-center justify-center gap-[3px]"
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
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25">
          <span className="h-3 w-3 rounded-[2px] bg-primary-foreground" />
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-white/15 border-t px-4 py-2 font-mono text-[0.58rem] uppercase tracking-[0.12em] sm:px-5">
        <span className="text-primary-foreground/55">
          Listening for key points
        </span>
        <span style={{ color: activeResult.color }}>{activeResult.label}</span>
      </div>
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
        data-gsap-hover
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        whileTap={reduceMotion ? undefined : { scale: 0.985 }}
        className="group flex w-full items-center gap-3 p-4 text-left text-strong"
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
        <div className="border-border border-t bg-muted px-4 pt-4 pb-5">
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
            className="w-[min(21rem,calc(100vw-2.5rem))] border border-white/15 bg-[var(--panel-deep)] p-5 text-left text-primary-foreground shadow-[6px_6px_0_rgba(5,28,20,0.72)]"
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
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-[var(--panel-deep)] text-primary-foreground shadow-[4px_4px_0_rgba(5,28,20,0.78)]"
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

function ScrollJourney() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStage, setActiveStage] = useState(0);
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
      className="relative h-[220vh] bg-background"
    >
      <div className="sticky top-0 flex h-screen items-start overflow-hidden border-white/10 border-y px-5 pt-28 md:px-8">
        <div
          data-scroll-reveal
          className="relative mx-auto grid w-full max-w-[72rem] gap-7 lg:grid-cols-[10rem_34rem_minmax(14rem,1fr)] lg:items-center"
        >
          <div className="hidden space-y-2 lg:block">
            {stages.map((item, index) => (
              <div
                key={item.label}
                className={`border-l-2 py-3 pl-5 font-mono text-xs uppercase tracking-[0.14em] ${
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

          <div
            data-gsap-hover
            className="relative overflow-hidden rounded-[1.1rem] border border-border bg-card p-4 shadow-[7px_8px_0_rgba(18,53,36,0.22)] md:p-6"
          >
            <div className="flex items-center justify-between font-mono text-[0.62rem] text-muted-foreground uppercase tracking-[0.12em]">
              <span>Live rehearsal · 01:42</span>
              <span>{activeStage + 1} / 3</span>
            </div>
            <div
              className={`mt-5 flex min-h-[20rem] flex-col rounded-none border-white/10 border-y border-r border-l-2 p-7 text-card-foreground md:p-9 ${stage.surface}`}
              style={{ borderLeftColor: stage.color }}
            >
              <div
                className="flex items-center gap-3 font-mono text-[0.64rem] uppercase tracking-[0.12em]"
                style={{ color: stage.color }}
              >
                <span
                  className="h-2.5 w-2.5"
                  style={{ backgroundColor: stage.color }}
                />
                {stage.eyebrow}
              </div>
              <p className="mt-7 max-w-full font-sans font-bold text-[clamp(2.1rem,3.35vw,3.45rem)] text-white leading-[0.98] tracking-[-0.045em]">
                {stage.quote}
              </p>
              <p className="mt-auto max-w-[30rem] pt-7 text-primary-foreground/70 leading-relaxed">
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
            <h2 className="mt-5 font-sans font-bold text-[clamp(2.35rem,3.5vw,3.8rem)] text-strong uppercase leading-[0.92] tracking-[-0.05em]">
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
            <h2 className="mt-5 max-w-[14ch] font-sans font-bold text-[clamp(2.7rem,5vw,5rem)] text-strong uppercase leading-[0.9] tracking-[-0.055em]">
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
  const brandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!heroRef.current || !pageRef.current) return;

    let gsapContext: { revert: () => void } | undefined;
    let cancelled = false;
    const hoverCleanups: Array<() => void> = [];
    const generatedNodes: HTMLElement[] = [];

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled || !heroRef.current || !pageRef.current) return;
        gsap.registerPlugin(ScrollTrigger);
        gsapContext = gsap.context(() => {
          gsap
            .timeline()
            .from("[data-hero-word]", {
              yPercent: 125,
              rotate: 4,
              opacity: 0,
              duration: 0.95,
              stagger: 0.07,
              ease: "power3.out",
            })
            .from(
              "[data-hero-secondary]",
              {
                y: 40,
                opacity: 0,
                duration: 0.85,
                stagger: 0.15,
                ease: "power3.out",
              },
              "-=0.4",
            );

          if (!reduceMotion) {
            gsap.to("[data-kinetic]", {
              y: (index) => (index % 2 === 0 ? -7 : 6),
              rotate: (index) => (index % 2 === 0 ? -1.2 : 1.2),
              duration: (index) => 4.2 + index * 0.4,
              stagger: 0.16,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            });

            gsap.to(".lp-atmosphere", {
              backgroundPosition: "center 62%",
              ease: "none",
              scrollTrigger: {
                trigger: "#hero",
                start: "top top",
                end: "bottom top",
                scrub: 1.2,
              },
            });
          }

          gsap.fromTo(
            "[data-gsap-lock]",
            { x: -42 },
            { x: 0, duration: 0.62, stagger: 0.06, ease: "expo.out" },
          );

          if (brandRef.current) {
            gsap.set("#bg-logo", {
              x: 0,
              xPercent: -50,
              yPercent: -50,
              transformOrigin: "50% 50%",
            });
            gsap
              .timeline({
                scrollTrigger: {
                  trigger: "#hero",
                  start: "top top",
                  end: "45% top",
                  scrub: reduceMotion ? false : 1,
                  invalidateOnRefresh: true,
                },
              })
              .to("#bg-logo", {
                x: () => {
                  const target = document
                    .querySelector(".lp-nav-brand-mark-target")
                    ?.getBoundingClientRect();
                  return target
                    ? target.left + target.width / 2 - window.innerWidth / 2
                    : 0;
                },
                xPercent: -50,
                y: () => {
                  const target = document
                    .querySelector(".lp-nav-brand-mark-target")
                    ?.getBoundingClientRect();
                  return target
                    ? target.top + target.height / 2 - window.innerHeight / 2
                    : -window.innerHeight / 2 + 32;
                },
                yPercent: -50,
                scale: () => {
                  const target = document.querySelector(
                    ".lp-nav-brand-mark-target",
                  ) as HTMLElement | null;
                  return target && brandRef.current
                    ? target.offsetWidth / brandRef.current.offsetWidth
                    : 0.11;
                },
                color: "var(--primary-foreground)",
                opacity: 1,
                duration: 1,
                ease: "power2.inOut",
              })
              .to(
                ".lp-sky-nav",
                {
                  backgroundColor: "rgba(5, 34, 23, 0.98)",
                  duration: 0.35,
                },
                0.55,
              );
          }

          gsap.utils
            .toArray<HTMLElement>("[data-scroll-reveal]")
            .forEach((element) => {
              gsap.from(element, {
                y: 56,
                opacity: 0,
                duration: 0.9,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: element,
                  start: "top 85%",
                  once: true,
                },
              });
            });

          gsap.from(".lp-product-window", {
            y: 120,
            scale: 0.92,
            rotate: -1.5,
            opacity: 0,
            duration: 1.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ".lp-product-window",
              start: "top 88%",
              once: true,
            },
          });

          gsap.utils
            .toArray<HTMLElement>("[data-feature-card]")
            .forEach((element, index) => {
              gsap.from(element, {
                x: index % 2 === 0 ? -110 : 110,
                rotate: index % 2 === 0 ? -1.5 : 1.5,
                opacity: 0,
                duration: 1,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: element,
                  start: "top 86%",
                  once: true,
                },
              });
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
        }, pageRef);
      },
    );

    return () => {
      cancelled = true;
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
      <div
        id="bg-logo"
        ref={brandRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-1/2 left-1/2 z-[60] h-[clamp(12rem,25vw,23rem)] w-[clamp(12rem,25vw,23rem)] -translate-x-1/2 -translate-y-1/2 text-[var(--ok-light)] opacity-[0.18] will-change-transform"
      >
        <ExplainaloudMark className="h-full w-full" strokeWidth={4.5} />
      </div>
      <nav className="lp-sky-nav fixed inset-x-0 top-0 z-50 border-white/20 border-b text-primary-foreground">
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
            className="lp-nav-brand flex h-8 min-w-44 items-center justify-center gap-2.5 text-primary-foreground"
            aria-label="Explainaloud home"
          >
            <span className="lp-nav-brand-copy font-sans font-semibold text-sm tracking-[-0.02em]">
              Explainaloud
            </span>
            <span
              aria-hidden="true"
              className="lp-nav-brand-mark-target h-6 w-6 shrink-0 opacity-0"
            />
          </Link>
          <div className="flex items-center justify-self-end gap-2">
            <Link href="/login" className="px-4 py-2 text-sm hover:text-white">
              Log in
            </Link>
            <Link
              href="/signup"
              data-gsap-hover
              className="inline-flex items-center gap-2 border border-card bg-card px-4 py-2 text-card-foreground text-sm"
            >
              Start free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      <section
        id="hero"
        ref={heroRef}
        className="lp-atmosphere relative overflow-hidden border-white/15 border-b bg-primary px-5 pb-20 text-primary-foreground md:px-8 md:pb-28"
      >
        <div className="relative min-h-screen pt-24 md:pt-28">
          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-12rem)] max-w-[76rem] flex-col items-center justify-center pb-48 text-center md:pb-44">
            <h1 className="relative mx-auto max-w-[12ch] font-display text-[clamp(3.35rem,6.8vw,7rem)] text-primary-foreground leading-[0.88] tracking-[-0.055em]">
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

            <div
              data-kinetic
              aria-hidden="true"
              className="absolute top-[19%] left-[2%] hidden -rotate-3 border border-white/35 bg-[var(--ok)] px-4 py-3 font-mono text-[0.65rem] text-white uppercase tracking-[0.12em] shadow-[4px_4px_0_rgba(5,28,20,0.75)] lg:block"
            >
              Reached · main point
            </div>
            <div
              data-kinetic
              aria-hidden="true"
              className="absolute top-[30%] right-[1%] hidden rotate-2 border border-white/35 bg-[var(--vague)] px-4 py-3 font-mono text-[0.65rem] text-white uppercase tracking-[0.12em] shadow-[4px_4px_0_rgba(5,28,20,0.75)] lg:block"
            >
              Too thin · evidence
            </div>
            <div
              data-kinetic
              aria-hidden="true"
              className="absolute bottom-[24%] left-[8%] hidden rotate-1 border border-white/35 bg-[var(--miss)] px-4 py-3 font-mono text-[0.65rem] text-white uppercase tracking-[0.12em] shadow-[4px_4px_0_rgba(5,28,20,0.75)] lg:block"
            >
              Missed · example
            </div>

            <p
              data-hero-secondary
              className="mt-7 max-w-[34rem] text-primary-foreground/85 text-lg leading-relaxed"
            >
              Rehearse out loud. See which ideas landed, which were rushed, and
              which never made it into your explanation.
            </p>

            <motion.div
              data-hero-secondary
              data-gsap-lock
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                href="/signup"
                data-gsap-hover
                className="group inline-flex h-12 items-center gap-5 border border-[var(--accent-solid)] bg-[var(--accent-solid)] px-6 font-medium text-[var(--brand-foreground)] shadow-[4px_4px_0_rgba(5,28,20,0.85)]"
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

          <div className="pointer-events-none absolute inset-0">
            <MarqueeRibbon />
          </div>
        </div>
      </section>

      <section
        id="live-demo"
        className="bg-background px-5 pt-16 pb-20 md:px-8 md:pt-20 md:pb-28"
      >
        <motion.div
          data-story-section
          data-gsap-lock
          data-gsap-hover
          className="lp-product-window mx-auto max-w-[68rem] overflow-hidden rounded-[1.6rem] border border-[rgba(18,53,36,0.2)] bg-card shadow-[10px_12px_0_rgba(5,28,20,0.82)]"
        >
          <div
            data-story-step
            className="flex items-center border-border border-b px-5 py-4"
          >
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
            </div>
            <span className="mx-auto -translate-x-5 font-mono text-[0.65rem] text-muted-foreground uppercase tracking-[0.12em]">
              Live explanation · Physics
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
              <p className="font-mono text-[0.65rem] text-muted-foreground uppercase tracking-[0.12em]">
                What you missed
              </p>
              <div
                data-gsap-hover
                className="mt-6 rounded-sm border border-white/10 border-l-2 border-l-miss bg-[var(--panel-deep)] p-5 shadow-[4px_4px_0_#000]"
              >
                <span className="font-mono text-[0.62rem] text-miss uppercase tracking-[0.12em]">
                  Missing step
                </span>
                <p className="mt-3 font-display text-[1.45rem] text-primary-foreground leading-snug">
                  You named the rule, but skipped why the forces do not cancel.
                </p>
                <p className="mt-3 text-primary-foreground/65 text-sm leading-relaxed">
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
        data-story-section
        data-scroll-reveal
        className="border-border border-t bg-card px-5 py-24 md:px-8 md:py-32"
      >
        <div className="mx-auto max-w-[76rem]">
          <motion.p
            data-story-step
            className="font-mono text-[0.68rem] text-brand-ink uppercase tracking-[0.13em]"
          >
            A better study loop
          </motion.p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <h2
              data-story-step
              className="max-w-[12ch] font-display text-[clamp(2.8rem,5vw,5rem)] text-strong leading-[0.98] tracking-[-0.045em]"
            >
              Understanding shows up when you speak.
            </h2>
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
        style={closingForestStyle}
      >
        <motion.div
          data-scroll-reveal
          className="mx-auto max-w-[68rem] border border-white/15 bg-[var(--panel-deep)] px-6 py-20 text-left text-primary-foreground shadow-[6px_6px_0_rgba(3,20,14,0.55)] md:px-12 md:py-28"
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
