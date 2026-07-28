"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { type Example, ExampleCarousel } from "~/components/example-carousel";
import { Magnetic } from "~/components/magnetic";
import { Marquee } from "~/components/marquee";
import { PasswordField } from "~/components/password-field";
import { ScrollProgress } from "~/components/scroll-progress";
import { SmoothScroll } from "~/components/smooth-scroll";
import { Spotlight } from "~/components/spotlight";
import { TiltCard } from "~/components/tilt-card";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { useCyclingTypewriter } from "~/hooks/use-cycling-typewriter";
import { useInView } from "~/hooks/use-in-view";
import { emailError } from "~/lib/email";
import { passwordRequirementError } from "~/lib/password";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

type AuthMode = "signup" | "login";
type Stage = "form" | "check-email" | "forgot-password" | "reset-sent";

const EASE = [0.23, 1, 0.32, 1] as const;
const EASE_CSS = "ease-[cubic-bezier(0.23,1,0.32,1)]";

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: EASE }}
      className={cn("relative", className)}
    >
      {children}
    </motion.div>
  );
}

/**
 * Headline reveal, one word at a time. Each word rises out of a slight blur —
 * the blur is what makes it read as "coming into focus" rather than a plain
 * fade, and it hides the sub-pixel jitter of the y-translation.
 */
function WordReveal({
  text,
  className,
  delay = 0,
  accent = [],
}: {
  text: string;
  className?: string;
  delay?: number;
  /** Words rendered in the brand color — one highlighted phrase per headline. */
  accent?: string[];
}) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(" ");

  // One observer on the headline, staggering its children — not one observer
  // per word. Per-word observers are both wasteful and unreliable: a short
  // word can fail to trigger and stay stuck at opacity 0 while its neighbors
  // animate in, leaving a hole in the sentence.
  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        staggerChildren: shouldReduceMotion ? 0 : 0.045,
        delayChildren: delay / 1000,
      }}
    >
      {words.map((word, i) => (
        // Real whitespace has to live between the word spans, not as a margin
        // on them: an inline-block with `mr-*` looks spaced but concatenates
        // into "Theillusionof..." when copied or read aloud.
        // biome-ignore lint/suspicious/noArrayIndexKey: static text, words repeat
        <Fragment key={`${word}-${i}`}>
          <motion.span
            className={cn(
              "inline-block",
              // Accent words switch to the italic display serif. The serif
              // sits smaller on the same point size, so it gets nudged up to
              // keep the baseline optically level with the sans around it.
              accent.includes(word.replace(/[.,]/g, "")) &&
                "font-display text-[1.12em] leading-[0.9] font-normal text-brand italic",
            )}
            variants={{
              hidden: shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 16, filter: "blur(8px)" },
              visible: {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: { duration: 0.6, ease: EASE },
              },
            }}
          >
            {word}
          </motion.span>{" "}
        </Fragment>
      ))}
    </motion.span>
  );
}

export default function Home() {
  const journeyRef = useRef<HTMLDivElement>(null);

  return (
    // `dark` is pinned here rather than inherited: the whole marketing design
    // is glass and glow over a near-black canvas, which has no light-mode
    // equivalent. The signed-in app is the part that honours the theme choice.
    <main className="dark relative flex min-h-screen flex-col items-center overflow-x-clip bg-background text-foreground">
      <SmoothScroll />
      <ScrollProgress />
      <Nav />

      {/* ── Section 1: Hero ─────────────────────────────────────────── */}
      <section className="relative flex w-full flex-col items-center px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <GlowOrb className="-top-32 left-1/2 h-[34rem] w-[52rem] -translate-x-1/2 opacity-[0.16]" />

        <div className="flex max-w-3xl flex-col items-center gap-6 text-center">
          <Eyebrow index="01" label="Ropes" />
          <h1 className="text-5xl leading-[1.1] font-semibold tracking-tight text-balance text-white sm:text-6xl">
            <WordReveal
              text="Know when you actually understand it."
              accent={["understand"]}
            />
          </h1>
          <Reveal delay={100}>
            <p className="max-w-2xl text-lg text-[#A1A1AA]">
              A team of specialist AI agents builds from your sources, listens
              to you explain the material, and independently checks the steps
              you skipped.
            </p>
          </Reveal>
          <Reveal delay={140}>
            <p className="font-mono text-sm text-[#71717A]">
              Try it on{" "}
              <TypedText phrases={HERO_TOPICS} className="text-brand" />
            </p>
          </Reveal>
          <Reveal delay={180} className="mt-2">
            <Magnetic>
              <Button
                asChild
                size="lg"
                className="shine group h-12 rounded-full bg-brand px-8 font-semibold text-white shadow-[0_0_40px_-8px_var(--color-brand)] transition-[transform,box-shadow] duration-200 ease-out hover:bg-brand/90 hover:shadow-[0_0_64px_-8px_var(--color-brand)] active:scale-[0.97]"
              >
                <a href="#signup">
                  Sign up free
                  <ArrowRight className="ml-1 size-4 transition-transform duration-200 ease-out group-hover:translate-x-1" />
                </a>
              </Button>
            </Magnetic>
          </Reveal>
        </div>

        {/* Three-step flow, set as type rather than icon tiles. */}
        <Reveal delay={280} className="mt-20 w-full">
          <div className="mx-auto flex max-w-3xl flex-col items-stretch gap-4 sm:flex-row">
            <FlowStep step="01" label="Upload your sources" />
            <FlowStep step="02" label="Explain it out loud" />
            <FlowStep step="03" label="Get the gaps filled" />
          </div>
        </Reveal>
      </section>

      {/* ── Examples: what a real session looks like ─────────────────────
          No `overflow-hidden` on this section: the carousel pins itself with
          `position: sticky`, which any scroll-clipping ancestor would break.
          The clipping lives on the sticky panel inside instead. */}
      <section className="relative w-full">
        <ExampleCarousel
          examples={EXAMPLES}
          header={
            <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
              <GlowOrb className="-top-10 left-1/2 h-72 w-[36rem] -translate-x-1/2" />
              <Eyebrow index="02" label="Today's board" className="mb-4" />
              <h2 className="relative text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
                <WordReveal
                  text="What a session looks like"
                  accent={["session"]}
                />
              </h2>
              <Reveal delay={120} className="mt-4">
                <p className="max-w-md text-[#A1A1AA]">
                  A topic, an explanation scored on how well you actually said
                  it, and the exact step you skipped. Keep scrolling to turn the
                  ring.
                </p>
              </Reveal>
            </div>
          }
        />
      </section>

      {/* Ticker + stat band: a beat of motion between the hero and the essay. */}
      <div className="w-full border-y border-white/10 py-4">
        <Marquee items={MARQUEE_ITEMS} />
      </div>

      {/* ── Section 2: Multi-agent orchestration ──────────────────── */}
      <section className="relative w-full px-6 py-24">
        <GlowOrb className="top-10 left-[12%] h-80 w-80 opacity-[0.12]" />
        <div className="relative mx-auto grid max-w-5xl gap-12 md:grid-cols-[0.8fr_1.2fr] md:items-center md:gap-16">
          <div>
            <Eyebrow
              index="03"
              label="Multi-agent by design"
              className="mb-4"
            />
            <h2 className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
              <WordReveal
                text="One lesson. Several specialists."
                accent={["specialists"]}
              />
            </h2>
            <Reveal delay={120} className="mt-5">
              <p className="max-w-prose text-lg leading-relaxed text-[#A1A1AA]">
                Ropes does not ask one model to do everything. Each agent owns a
                specific job, passes its work forward, and leaves a visible
                trace so you can see how the result was made.
              </p>
            </Reveal>
          </div>
          <Reveal delay={160}>
            <LandingAgentPipeline />
          </Reveal>
        </div>
      </section>

      {/* Sections 2 → 5 share one scroll-drawn squiggle that winds from
          "The illusion of competence" all the way down to the sign-up form. */}
      <div ref={journeyRef} className="relative w-full">
        <ScrollSquiggle target={journeyRef} />

        {/* ── Section 2: The Illusion of Competence ─────────────────── */}
        <section className="w-full px-6 py-24">
          <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
            <div>
              <Eyebrow index="04" label="Why it works" className="mb-4" />
              <h2 className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
                <WordReveal
                  text="The illusion of competence"
                  accent={["illusion"]}
                />
              </h2>
            </div>
            <Reveal delay={120}>
              <div className="flex max-w-prose flex-col gap-5 text-lg text-[#A1A1AA]">
                <p>
                  Rereading feels like learning. The material looks familiar, so
                  your brain files it as known. But recognition is not recall,
                  and exams only test recall.
                </p>
                <p>
                  The gaps stay hidden until you explain the idea in your own
                  words. Ropes is built around that moment.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Section 3: Feature grid ──────────────────────────────────── */}
        <section className="relative w-full px-6 py-24">
          {/* Glow orbs BEHIND the glass cards — these make the blur visible */}
          <GlowOrb className="top-16 left-[22%] h-80 w-80" />
          <GlowOrb className="bottom-16 right-[18%] h-96 w-96" />

          <Eyebrow
            index="05"
            label="What you get"
            className="mx-auto mb-4 max-w-6xl"
          />

          <FeatureRow>
            <FeatureCard>
              <div className="mb-4 flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-brand" />
                </span>
                <span className="text-xs font-medium text-[#A1A1AA]">
                  Recording
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white">
                Live transcription
              </h3>
              <p className="mt-2 text-sm text-[#A1A1AA]">
                Watch your explanation take shape as you speak.
              </p>
              <LiveTranscript />
            </FeatureCard>

            <FeatureCard>
              <h3 className="text-lg font-semibold text-white">
                Gaps get filled, not just flagged
              </h3>
              <p className="mt-2 text-sm text-[#A1A1AA]">
                Skip a step and a short correction appears right where you
                needed it.
              </p>
              <p className="mt-auto rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-[#A1A1AA]">
                the Calvin cycle{" "}
                <span className="font-medium text-brand">
                  fixes CO₂ into glucose
                </span>
              </p>
            </FeatureCard>

            <FeatureCard>
              <h3 className="text-lg font-semibold text-white">
                Built from your sources
              </h3>
              <p className="mt-2 text-sm text-[#A1A1AA]">
                Upload what you already have.
              </p>
              <div className="mt-auto flex flex-col gap-2 font-mono text-[11px] tracking-[0.14em] text-[#71717A] uppercase">
                <span className="border-t border-white/10 pt-2">
                  Textbook chapters
                </span>
                <span className="border-t border-white/10 pt-2">
                  Lecture recordings
                </span>
                <span className="border-t border-white/10 pt-2">
                  Slide decks
                </span>
              </div>
            </FeatureCard>

            <FeatureCard>
              <h3 className="text-lg font-semibold text-white">
                Then builds you a plan
              </h3>
              <p className="mt-2 text-sm text-[#A1A1AA]">
                Your gap report becomes a short plan: review, practice, or
                mastered.
              </p>
              <div className="mt-auto flex flex-col gap-2">
                {PLAN_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        item.status === "Review"
                          ? "bg-brand"
                          : item.status === "Practice"
                            ? "bg-white/40"
                            : "bg-white/20",
                      )}
                    />
                    <span className="truncate text-[#A1A1AA]">
                      {item.label}
                    </span>
                    <span className="ml-auto shrink-0 text-[#71717A]">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </FeatureCard>
          </FeatureRow>
        </section>

        {/* ── Section 4: How it works, in detail ──────────────────────── */}
        <section className="relative w-full px-6 py-24">
          <div className="mx-auto mb-20 flex max-w-2xl flex-col items-center text-center">
            <Eyebrow index="06" label="The flow" className="mb-4" />
            <h2 className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
              <WordReveal text="How it works" accent={["works"]} />
            </h2>
            <Reveal delay={120} className="mt-4">
              <p className="text-lg text-[#A1A1AA]">
                Click record, speak, learn.
              </p>
            </Reveal>
          </div>

          <div className="relative mx-auto flex max-w-4xl flex-col gap-24">
            <DeepDiveRow
              step="Step 1"
              title="Start with what you already have"
              body="Drop in your textbook chapters, lecture recordings, and slides. The course is built from your actual material."
              mockup={<SourcesPanel />}
            />
            <DeepDiveRow
              reversed
              step="Step 2"
              title="Say it back, out loud"
              body="Hit record and explain the concept like you're teaching a friend. Shaky steps get flagged as you say them."
              mockup={<ExplainPanel />}
            />
            <DeepDiveRow
              step="Step 3"
              title="See exactly where you stand"
              body="Every topic gets a confidence score from your explanation. Weak areas become tomorrow's study plan."
              mockup={<GapPanel />}
            />
          </div>

          <Reveal className="mt-20 flex justify-center">
            <SignUpLead />
          </Reveal>
        </section>

        {/* ── Section 5: Sign up / Footer ─────────────────────────────── */}
        <section className="relative flex w-full flex-col items-center px-6 py-24">
          <GlowOrb className="top-0 left-1/2 h-80 w-[40rem] -translate-x-1/2" />

          <div className="relative flex flex-col items-center text-center">
            <Eyebrow index="07" label="Get started" className="mb-4" />
            <h2 className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
              <WordReveal text="Create your account" accent={["account"]} />
            </h2>
            <Reveal delay={120} className="mt-4">
              <p className="max-w-md text-lg text-[#A1A1AA]">
                Sign up free and we&apos;ll email you when Ropes is ready.
              </p>
            </Reveal>
          </div>

          <Reveal delay={120} className="relative mt-10 w-full max-w-md">
            <AuthCard />
          </Reveal>
        </section>
      </div>

      <footer className="w-full border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between text-sm text-[#71717A]">
          <span className="font-medium text-[#A1A1AA]">Ropes</span>
          <span>© 2026 Ropes</span>
        </div>
      </footer>
    </main>
  );
}

const MARQUEE_ITEMS = [
  "Specialist agents, visible handoffs",
  "Explain it out loud",
  "Recognition isn't recall",
  "Gaps filled, not just flagged",
  "Built from your own sources",
  "Learn the ropes",
];

const LANDING_AGENTS = [
  {
    role: "Source Scout",
    task: "Finds the evidence your lesson should trust.",
  },
  {
    role: "Course Architect",
    task: "Turns that evidence into a teachable course.",
  },
  {
    role: "Accuracy Reviewer",
    task: "Checks the draft before it reaches you.",
  },
];

function LandingAgentPipeline() {
  const shouldReduceMotion = useReducedMotion();
  const [activeAgent, setActiveAgent] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const timer = window.setInterval(() => {
      setActiveAgent((current) => (current + 1) % LANDING_AGENTS.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [shouldReduceMotion]);

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <span className="font-mono text-[10px] tracking-[0.14em] text-[#A1A1AA] uppercase">
          Orchestration trace
        </span>
        <span className="flex items-center gap-2 text-xs text-[#8FBCEC]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-brand" />
          </span>
          Agents working
        </span>
      </div>
      <ol>
        {LANDING_AGENTS.map((agent, index) => {
          const isActive = index === activeAgent;
          const isComplete = index < activeAgent;
          return (
            <li
              key={agent.role}
              className={cn(
                "flex gap-4 px-5 py-4 transition-colors duration-200",
                index > 0 && "border-t border-white/10",
                isActive && "bg-brand/[0.08]",
              )}
            >
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "mt-1 size-2.5 shrink-0 rounded-full",
                    isActive &&
                      "animate-pulse bg-brand motion-reduce:animate-none",
                    isComplete && "bg-emerald-400",
                    !isActive && !isComplete && "bg-white/20",
                  )}
                />
                {index < LANDING_AGENTS.length - 1 && (
                  <span className="mt-2 h-full w-px bg-white/10" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">
                    {agent.role}
                  </h3>
                  <span
                    className={cn(
                      "font-mono text-[9px] tracking-[0.1em] uppercase",
                      isActive ? "text-brand" : "text-[#71717A]",
                    )}
                  >
                    {isActive
                      ? "Working"
                      : isComplete
                        ? "Handed off"
                        : "Queued"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#A1A1AA]">{agent.task}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="border-t border-white/10 px-5 py-3 text-xs text-[#71717A]">
        Every completed run is saved with its agent trace.
      </div>
    </div>
  );
}

/* Illustrative sessions, not real user data — nothing has shipped yet. The
   copy is written so it reads as "here's what a session looks like" rather
   than as a testimonial from someone who used it. */
const EXAMPLES: Example[] = [
  {
    subject: "Biology",
    topic: "Explain how the Calvin cycle fixes carbon",
    confidence: 54,
    gap: "Said energy becomes glucose “directly” — skipped the G3P intermediate entirely.",
  },
  {
    subject: "Organic chemistry",
    topic: "Walk through an SN2 reaction mechanism",
    confidence: 71,
    gap: "Got the backside attack right, never mentioned why bulky substrates kill the rate.",
  },
  {
    subject: "Macroeconomics",
    topic: "Why does raising rates slow inflation?",
    confidence: 38,
    gap: "Named the mechanism but couldn't connect it to borrowing cost or demand.",
  },
  {
    subject: "Linear algebra",
    topic: "What does an eigenvector actually mean?",
    confidence: 82,
    gap: "Strong geometric intuition, shaky on why the eigenvalue can be negative.",
  },
  {
    subject: "Neuroscience",
    topic: "Describe how an action potential propagates",
    confidence: 61,
    gap: "Skipped the refractory period, so the explanation allowed backward travel.",
  },
  {
    subject: "Statistics",
    topic: "What is a p-value actually telling you?",
    confidence: 45,
    gap: "Described it as the chance the hypothesis is true — that's the inverse.",
  },
  {
    subject: "Computer science",
    topic: "Why is quicksort O(n log n) on average?",
    confidence: 76,
    gap: "Explained the partitioning but never justified the log n recursion depth.",
  },
];

/* Rotating examples typed out under the hero headline. */
const HERO_TOPICS = [
  "the Calvin cycle.",
  "an SN2 mechanism.",
  "why rates slow inflation.",
  "what an eigenvector is.",
];

const PLAN_ITEMS: Array<{ label: string; status: string }> = [
  { label: "Electron transport chain", status: "Review" },
  { label: "Calvin cycle", status: "Practice" },
  { label: "Light reactions", status: "Mastered" },
];

/* Floating capsule nav that detaches from the page edge as you scroll: it
   narrows and lifts into a frosted pill rather than staying a full-bleed bar. */
function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full px-4 pt-4">
      <nav
        className={cn(
          "mx-auto flex items-center justify-between gap-4 rounded-full py-2 pr-2 pl-5 transition-[max-width,background-color,box-shadow] duration-500",
          EASE_CSS,
          scrolled ? "capsule max-w-2xl" : "max-w-4xl bg-transparent",
        )}
      >
        <span className="text-base font-semibold tracking-tight text-white">
          Ropes
        </span>
        <Magnetic strength={16}>
          <Button
            asChild
            size="sm"
            className="shine group h-9 rounded-full bg-brand px-5 font-semibold text-white transition-transform duration-200 ease-out hover:bg-brand/90 active:scale-[0.97]"
          >
            <a href="#signup">
              Sign up
              <ArrowRight className="ml-0.5 size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </a>
          </Button>
        </Magnetic>
      </nav>
    </header>
  );
}

/* Small tracked mono label that numbers each section — the editorial spine
   that makes a long scroll feel navigable instead of endless. */
function Eyebrow({
  index,
  label,
  className,
}: {
  index: string;
  label: string;
  className?: string;
}) {
  return (
    <Reveal className={className}>
      <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.18em] text-[#71717A] uppercase">
        <span className="text-brand">{index}</span>
        <span aria-hidden className="h-px w-6 bg-white/15" />
        {label}
      </p>
    </Reveal>
  );
}

/* Low-opacity blurred blue orb. Positioned absolutely inside a relative
   section, always behind content — this is what makes the glass cards read
   as glass. Drifts against the scroll direction for depth; the parallax is
   spring-damped so it never feels pinned to the scrollbar.
   Tailwind's translate utilities use the `translate` property in v4, so the
   inline `transform` Motion writes here composes with them instead of
   clobbering the -translate-x-1/2 centering some callers rely on. */
function GlowOrb({
  className,
  drift = 60,
}: {
  className?: string;
  drift?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useSpring(useTransform(scrollYProgress, [0, 1], [drift, -drift]), {
    stiffness: 60,
    damping: 24,
  });

  return (
    <motion.div
      ref={ref}
      aria-hidden
      style={shouldReduceMotion ? undefined : { y }}
      className={cn(
        "pointer-events-none absolute rounded-full bg-brand opacity-[0.18] blur-[70px]",
        className,
      )}
    />
  );
}

function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "glass glass-lift gap-0 overflow-hidden rounded-2xl border-0 bg-transparent py-0 shadow-none",
        className,
      )}
    >
      <Spotlight className="flex flex-1 flex-col">{children}</Spotlight>
    </Card>
  );
}

/* All four feature cards on screen at once. They were a drag-scroll rail;
   at four cards that was a gesture standing between the reader and content
   already small enough to fit, so the cards shrank instead. */
function FeatureRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

/* A feature card. Fluid width now that the row is a grid, and shorter than
   the old rail cards so four fit a laptop viewport without scrolling. */
function FeatureCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TiltCard className={cn("w-full", className)}>
      <GlassCard className="flex h-64 flex-col p-5">{children}</GlassCard>
    </TiltCard>
  );
}

/* One winding line drawn across sections 2 → 5 as the user scrolls. It
   weaves left and right, ducking behind the glass cards it crosses, and
   ends at the sign-up form. The viewBox stretches to the wrapper's size;
   vectorEffect keeps the stroke width constant. */
/**
 * Every join after the first uses `S` (smooth curveto), which derives its
 * first control point by reflecting the previous segment's second control
 * point through the join. That makes tangent continuity structural rather
 * than something to hand-tune — the old hand-written `C` chain kinked where
 * the control points fell out of line, worst of all in the tail.
 *
 * The tail is now a single long sweep into (500, 985) — centred on the
 * sign-up card — instead of three short wiggles that read as a stumble right
 * where the line is meant to be leading somewhere.
 */
const SQUIGGLE_PATH = [
  "M 150 22",
  "C 400 55, 740 40, 810 130",
  "S 420 200, 260 265",
  "S 660 315, 725 415",
  "S 300 475, 240 565",
  "S 690 620, 735 705",
  "S 480 880, 500 985",
].join(" ");

function ScrollSquiggle({
  target,
}: {
  target: React.RefObject<HTMLDivElement | null>;
}) {
  const shouldReduceMotion = useReducedMotion();
  const guideRef = useRef<SVGPathElement>(null);
  // Scroll progress is a vertical fraction of the wrapper, but pathLength is
  // an arc-length fraction, and the sideways weaving makes the two diverge.
  // This table maps y-fraction -> arc-length fraction so the drawn tip stays
  // level with whatever content is at the viewport center.
  const [yToLength, setYToLength] = useState<number[] | null>(null);
  // The viewport center can never reach the wrapper's very end (the page
  // stops scrolling first), so track the highest progress actually reachable
  // and accelerate the final stretch to finish exactly at max scroll.
  const [maxProgress, setMaxProgress] = useState(1);

  useEffect(() => {
    const path = guideRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    const N = 200;
    const ys: number[] = [];
    for (let i = 0; i <= N; i++) {
      const pt = path.getPointAtLength((i / N) * total);
      // Clamp to monotonic so brief upward wiggles can't reverse the map
      ys.push(Math.max(pt.y / 1000, ys[i - 1] ?? 0));
    }
    const table: number[] = [];
    let j = 0;
    for (let i = 0; i <= N; i++) {
      const y = i / N;
      while (j < N - 1 && ys[j + 1] < y) j++;
      const span = ys[j + 1] - ys[j];
      const t = span > 0 ? (y - ys[j]) / span : 0;
      table.push(Math.min(1, Math.max(0, (j + t) / N)));
    }
    setYToLength(table);

    const measure = () => {
      const wrapper = target.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const topAbs = rect.top + window.scrollY;
      const maxCenter =
        document.documentElement.scrollHeight - window.innerHeight / 2;
      setMaxProgress(
        Math.min(1, Math.max(0.5, (maxCenter - topAbs) / rect.height)),
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [target]);

  // "start 0.5" / "end 0.5": progress equals the wrapper fraction currently
  // at the middle of the screen.
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start 0.5", "end 0.5"],
  });
  const remapped = useTransform(scrollYProgress, (v) => {
    // Track the viewport center for most of the journey, then sprint the
    // last stretch so the line completes right as scrolling bottoms out.
    const runway = Math.max(0.05, maxProgress - 0.12);
    let yFrac = v;
    if (v > runway) {
      const t = Math.min(1, (v - runway) / (maxProgress - runway));
      yFrac = runway + t * (1 - runway);
    }
    yFrac = Math.min(1, Math.max(0, yFrac));
    if (!yToLength) return yFrac;
    const idx = Math.min(
      yToLength.length - 1,
      Math.max(0, Math.round(yFrac * (yToLength.length - 1))),
    );
    return yToLength[idx];
  });
  const pathLength = useSpring(remapped, {
    stiffness: 90,
    damping: 25,
  });

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative, aria-hidden
    <svg
      aria-hidden
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      fill="none"
      className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
    >
      <defs>
        <linearGradient
          id="squiggle-stroke"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2="1000"
        >
          <stop offset="0%" stopColor="#7FB3F0" />
          <stop offset="100%" stopColor="#4A90E2" />
        </linearGradient>
        <filter id="squiggle-glow">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      {/* Invisible copy of the path, kept only for length measurements */}
      <path ref={guideRef} d={SQUIGGLE_PATH} stroke="none" />
      {/* Soft glow under the drawn line. No vector-effect here: it breaks
          pathLength-normalized dashes in Chrome, which the draw-on-scroll
          animation depends on. */}
      <motion.path
        d={SQUIGGLE_PATH}
        stroke="var(--color-brand)"
        strokeOpacity="0.3"
        strokeWidth="4"
        strokeLinecap="round"
        filter="url(#squiggle-glow)"
        style={{ pathLength: shouldReduceMotion ? 1 : pathLength }}
      />
      <motion.path
        d={SQUIGGLE_PATH}
        stroke="url(#squiggle-stroke)"
        strokeOpacity="0.65"
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ pathLength: shouldReduceMotion ? 1 : pathLength }}
      />
    </svg>
  );
}

/* Cue at the end of "How it works" leading down to the sign-up form. */
function SignUpLead() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <a
      href="#signup"
      className="group flex flex-col items-center gap-3 font-mono text-xs tracking-[0.18em] text-[#A1A1AA] uppercase transition-colors hover:text-white"
    >
      Ready when you are
      <motion.span
        aria-hidden
        animate={shouldReduceMotion ? undefined : { scaleY: [1, 1.5, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="block h-8 w-px origin-top bg-gradient-to-b from-brand to-transparent"
      />
    </a>
  );
}

/* Hero flow step — a numbered rule and a label. No icon: a glyph here would
   only restate the words next to it. */
function FlowStep({ step, label }: { step: string; label: string }) {
  return (
    <div className="group flex-1 border-t border-white/10 pt-4 transition-colors duration-200 ease-out hover:border-brand/50">
      <p className="font-mono text-[11px] tracking-[0.18em] text-brand uppercase">
        {step}
      </p>
      <p className="mt-2 text-left text-sm font-medium text-[#A1A1AA] transition-colors duration-200 group-hover:text-white">
        {label}
      </p>
    </div>
  );
}

/* Looping typewriter with a caret that blinks while idle and holds solid
   while characters are moving — a caret that blinks mid-word reads as a
   rendering glitch rather than as typing. */
function TypedText({
  phrases,
  className,
}: {
  phrases: string[];
  className?: string;
}) {
  const { text, idle, done } = useCyclingTypewriter(phrases);

  return (
    <span className={className}>
      {text}
      {!done && (
        <span
          aria-hidden
          className={cn("ml-px inline-block", idle && "animate-caret")}
        >
          |
        </span>
      )}
    </span>
  );
}

function DeepDiveRow({
  step,
  title,
  body,
  mockup,
  reversed = false,
}: {
  step: string;
  title: string;
  body: string;
  mockup: React.ReactNode;
  reversed?: boolean;
}) {
  return (
    <Reveal>
      <div
        className={cn(
          "relative flex flex-col items-center gap-10 md:flex-row md:gap-16",
          reversed && "md:flex-row-reverse",
        )}
      >
        <GlowOrb
          className={cn(
            "top-1/2 h-72 w-72 -translate-y-1/2",
            reversed ? "left-[5%]" : "right-[5%]",
          )}
        />
        <div className="relative flex-1">
          <p className="text-sm font-semibold text-brand">{step}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-balance text-white">
            {title}
          </h3>
          <p className="mt-3 max-w-prose text-[#A1A1AA]">{body}</p>
        </div>
        <MockupPanel reversed={reversed}>{mockup}</MockupPanel>
      </div>
    </Reveal>
  );
}

/* The mockup swings up from a tilted-back resting position as it enters,
   then follows the cursor once it's settled. Both rotations live on nested
   elements so the entrance and the hover tilt never fight over `transform`. */
function MockupPanel({
  children,
  reversed,
}: {
  children: React.ReactNode;
  reversed: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="relative w-full max-w-sm flex-1"
      initial={
        shouldReduceMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              y: 40,
              rotateX: 18,
              rotateY: reversed ? 10 : -10,
              scale: 0.95,
            }
      }
      whileInView={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: EASE }}
      style={{ transformPerspective: 1000 }}
    >
      <TiltCard>
        <GlassCard className="min-h-56">{children}</GlassCard>
      </TiltCard>
    </motion.div>
  );
}

const TRANSCRIPT_LINES = [
  "...and that energy turns directly into glucose.",
  "...so the electrons just move down the chain.",
  "...which is where the carbon gets fixed, I think.",
];

function LiveTranscript() {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex h-6 items-end gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="waveform-bar w-1 rounded-full bg-brand"
            style={{ height: "1.25rem", animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
      <p className="min-h-[2.5rem] text-xs text-[#A1A1AA]">
        <TypedText phrases={TRANSCRIPT_LINES} />
      </p>
    </div>
  );
}

function SourcesPanel() {
  return (
    <div className="flex flex-col gap-2 p-5">
      {["Textbook.pdf", "Lecture.mp4", "Slides.key"].map((label) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[#A1A1AA]"
        >
          <span className="size-1.5 rounded-full bg-brand" />
          {label}
        </div>
      ))}
      <div className="mt-1 rounded-md border border-brand/20 bg-brand/10 px-3 py-2 text-xs font-medium text-[#8FBCEC]">
        Course ready · Photosynthesis
      </div>
    </div>
  );
}

/* Single phrase on purpose: the "Flagged" line below quotes the word
   "directly", so cycling other sentences here would make it nonsense. */
const EXPLAIN_LINES = ["...energy turns directly into glucose."];

function ExplainPanel() {
  return (
    <div className="flex flex-col gap-2.5 p-5 text-xs">
      <p className="text-[#A1A1AA]">
        &ldquo;Plants convert sunlight into chemical energy.&rdquo;
      </p>
      <p className="text-[#A1A1AA]">
        &ldquo;That happens in the chloroplasts.&rdquo;
      </p>
      <div className="rounded-md border border-brand/20 bg-brand/10 p-3">
        <p className="min-h-8 text-white">
          &ldquo;
          <TypedText phrases={EXPLAIN_LINES} />
          &rdquo;
        </p>
        <p className="mt-1.5 font-medium text-[#8FBCEC]">
          Flagged: what do you mean by &ldquo;directly&rdquo;?
        </p>
      </div>
    </div>
  );
}

function GapPanel() {
  const { ref, visible } = useInView<HTMLDivElement>();
  const rows: Array<{ label: string; pct: number }> = [
    { label: "Light reactions", pct: 92 },
    { label: "Calvin cycle", pct: 54 },
    { label: "Electron transport", pct: 28 },
  ];

  return (
    <div ref={ref} className="flex flex-col gap-3 p-5">
      {rows.map((row, i) => (
        <div key={row.label} className="flex flex-col gap-1.5">
          <span className="text-xs text-[#A1A1AA]">{row.label}</span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full bg-brand transition-[width] duration-700 ${EASE_CSS}`}
              style={{
                width: visible ? `${row.pct}%` : "0%",
                opacity: row.pct / 100 + 0.3,
                transitionDelay: `${i * 100}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function oauthErrorMessage(): string {
  return "That sign-in method isn't set up yet. Try email instead.";
}

/**
 * Where the emailed confirmation link lands. Sending it to `/onboarding`
 * rather than the callback default skips a bounce through `/dashboard`, whose
 * profile guard would only redirect a freshly verified account right back.
 */
function verificationRedirect(): string {
  return `${window.location.origin}/auth/callback?next=/onboarding`;
}

function authErrorMessage(mode: AuthMode, message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("email not confirmed")) {
    return "Verify your email before logging in. Check your inbox for the confirmation link.";
  }
  if (
    lower.includes("already registered") ||
    lower.includes("already exists")
  ) {
    return "That email already has an account. Try logging in instead.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Wrong email or password.";
  }
  if (mode === "signup" && lower.includes("password")) {
    return "Password isn't strong enough. Use 8+ characters with a mix of uppercase, lowercase, numbers, and symbols.";
  }
  return "Something went wrong. Try again.";
}

function AuthCard() {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [stage, setStage] = useState<Stage>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("authError") === "session-expired") {
      setMode("login");
      setError(
        "That sign-in is no longer valid. Sign in again, or create the account again if it was removed.",
      );
      window.history.replaceState({}, "", `${window.location.pathname}#signup`);
      return;
    }

    if (params.get("auth_error") === "1") {
      setMode("login");
      setError("We couldn't finish signing you in. Please try again.");
      window.history.replaceState({}, "", `${window.location.pathname}#signup`);
    }
  }, []);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
  }

  async function handleOAuth(provider: "google") {
    setError(null);
    setOauthLoading(provider);

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (oauthError) {
      setError(oauthErrorMessage());
      setOauthLoading(null);
    }
    // On success the browser redirects away, so no further state change here.
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      // Reject throwaway and undeliverable domains before we ever ask
      // Supabase to create the account.
      const addressError = emailError(email);
      if (addressError) {
        setError(addressError);
        return;
      }
      const requirementError = passwordRequirementError(password);
      if (requirementError) {
        setError(requirementError);
        return;
      }
    }

    setSubmitting(true);

    const supabase = createClient();
    const trimmedEmail = email.trim().toLowerCase();

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { emailRedirectTo: verificationRedirect() },
      });

      setSubmitting(false);

      if (signUpError) {
        setError(authErrorMessage(mode, signUpError.message));
        return;
      }

      if (data.session) {
        // New account — collect the profile before the dashboard.
        window.location.assign("/onboarding");
      } else {
        setStage("check-email");
      }
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (signInError) {
      setSubmitting(false);
      setError(authErrorMessage(mode, signInError.message));
      return;
    }

    // A full navigation guarantees the newly written auth cookies are present
    // before server-side dashboard and onboarding guards run.
    window.location.assign("/dashboard");
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      },
    );

    setSubmitting(false);

    if (resetError) {
      setError("Something went wrong. Try again.");
      return;
    }

    setStage("reset-sent");
  }

  async function handleResendVerification() {
    setResending(true);
    setResendStatus(null);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: verificationRedirect(),
      },
    });

    setResending(false);
    setResendStatus(
      resendError
        ? "We couldn't resend the link yet. Wait a minute, then try again."
        : "A new verification link is on its way.",
    );
  }

  return (
    <div
      id="signup"
      className="flex min-h-24 w-full scroll-mt-24 flex-col items-center justify-start"
    >
      {stage === "forgot-password" && (
        <form
          onSubmit={handleForgotPassword}
          className="glow-ring flex w-full flex-col gap-4 rounded-2xl bg-[#171717] p-6"
        >
          <div>
            <h3 className="text-base font-semibold text-white">
              Reset your password
            </h3>
            <p className="mt-1 text-sm text-[#71717A]">
              We&apos;ll email you a link to set a new password.
            </p>
          </div>
          <Input
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 border-[#333333] bg-[#1E1E1E] text-base text-white placeholder:text-[#71717A]"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            disabled={submitting}
            className="shine h-11 rounded-full bg-brand font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand)] transition-[transform,box-shadow] duration-200 ease-out hover:bg-brand/90 hover:shadow-[0_0_44px_-8px_var(--color-brand)] active:scale-[0.97]"
          >
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStage("form");
              setError(null);
            }}
            className="text-center text-xs font-medium text-[#A1A1AA] underline underline-offset-2 hover:text-white"
          >
            Back to log in
          </button>
        </form>
      )}

      {stage === "reset-sent" && (
        <p className="text-sm text-[#A1A1AA]">
          Check your email for a link to reset your password.
        </p>
      )}

      {stage === "form" && (
        <form
          onSubmit={handleSubmit}
          className="glow-ring flex w-full flex-col gap-4 rounded-2xl bg-[#171717] p-6"
        >
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={oauthLoading !== null}
              onClick={() => handleOAuth("google")}
              className="h-11 gap-2 rounded-full border-[#333333] bg-[#1E1E1E] font-medium text-white transition-transform duration-200 ease-out hover:bg-[#262626] active:scale-[0.98]"
            >
              <GoogleIcon className="size-4" />
              {oauthLoading === "google"
                ? "Redirecting…"
                : "Continue with Google"}
            </Button>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#71717A]">
            <span className="h-px flex-1 bg-white/10" />
            or continue with email
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="flex flex-col gap-3">
            <Input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 border-[#333333] bg-[#1E1E1E] text-base text-white placeholder:text-[#71717A]"
            />
            <PasswordField
              value={password}
              onChange={setPassword}
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              showStrength={mode === "signup"}
              showGenerate={mode === "signup"}
            />
            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setStage("forgot-password");
                  setError(null);
                }}
                className="self-end text-xs font-medium text-[#A1A1AA] underline underline-offset-2 hover:text-white"
              >
                Forgot password?
              </button>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            size="default"
            disabled={submitting || oauthLoading !== null}
            className="shine h-11 rounded-full bg-brand font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand)] transition-[transform,box-shadow] duration-200 ease-out hover:bg-brand/90 hover:shadow-[0_0_44px_-8px_var(--color-brand)] active:scale-[0.97]"
          >
            {submitting
              ? mode === "signup"
                ? "Signing up…"
                : "Logging in…"
              : mode === "signup"
                ? "Sign up"
                : "Log in"}
          </Button>
          <p className="text-center text-xs text-[#71717A]">
            {mode === "signup" ? (
              <>
                Already a member?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-medium text-[#A1A1AA] underline underline-offset-2 hover:text-white"
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-medium text-[#A1A1AA] underline underline-offset-2 hover:text-white"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </form>
      )}

      {stage === "check-email" && (
        <div className="glow-ring flex w-full flex-col gap-5 rounded-2xl bg-[#171717] p-6">
          <div>
            <h3 className="text-base font-semibold text-white">
              Verify your email
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">
              We sent a verification link to{" "}
              <span className="font-medium text-white">
                {email.trim().toLowerCase()}
              </span>
              . Open it to continue to Ropes.
            </p>
          </div>

          <p className="text-xs leading-5 text-[#71717A]">
            Didn&apos;t get it? Check spam, or resend the email after a minute.
          </p>

          {resendStatus && (
            <p role="status" className="text-sm text-[#A1A1AA]">
              {resendStatus}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            disabled={resending}
            onClick={handleResendVerification}
            className="h-11 rounded-full border-[#333333] bg-[#1E1E1E] font-medium text-white transition-transform duration-200 ease-out hover:bg-[#262626] active:scale-[0.98]"
          >
            {resending ? "Resending…" : "Resend verification email"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode("login");
              setStage("form");
              setResendStatus(null);
            }}
            className="text-center text-xs font-medium text-[#A1A1AA] underline underline-offset-2 hover:text-white"
          >
            Back to log in
          </button>
        </div>
      )}
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative, paired with visible button label
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.55-5.17 3.55-8.66Z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z"
        fill="#34A853"
      />
      <path
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1Z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z"
        fill="#EA4335"
      />
    </svg>
  );
}
