"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  FileText,
  Film,
  Mic,
  Presentation,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useInView } from "~/hooks/use-in-view";
import { useTypewriter } from "~/hooks/use-typewriter";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

type Stage = "form" | "done";

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

export default function Home() {
  const journeyRef = useRef<HTMLDivElement>(null);

  return (
    <main className="relative flex flex-col items-center overflow-x-clip bg-background text-foreground">
      <Nav />

      {/* ── Section 1: Hero ─────────────────────────────────────────── */}
      <section className="relative flex w-full flex-col items-center px-6 py-24 sm:py-32">
        <GlowOrb className="-top-32 left-1/2 h-[36rem] w-[48rem] -translate-x-1/2" />

        <div className="flex max-w-3xl flex-col items-center gap-6 text-center">
          <Reveal>
            <h1 className="text-5xl leading-[1.1] font-semibold tracking-tight text-balance text-white sm:text-6xl">
              Know when you actually understand it.
            </h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="max-w-2xl text-lg text-[#A1A1AA]">
              Know exactly when you actually understand it. TeachItBack listens
              to you explain your course material out loud, transcribes it live,
              and seamlessly fills in the missing steps so you can study
              smarter, not harder.
            </p>
          </Reveal>
          <Reveal delay={180} className="mt-2">
            <Button
              asChild
              size="lg"
              className="bg-brand px-8 font-semibold text-white shadow-[0_0_40px_-8px_var(--color-brand)] transition-[transform,box-shadow] hover:bg-brand/90 hover:shadow-[0_0_56px_-8px_var(--color-brand)] active:scale-[0.98]"
            >
              <a href="#waitlist">Join the Waitlist</a>
            </Button>
          </Reveal>
        </div>

        {/* 3-step abstract flow — Lucide icons, no CSS arrows */}
        <Reveal delay={280} className="mt-20 w-full">
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 sm:flex-row sm:gap-4">
            <FlowStep icon={Upload} label="Upload sources" />
            <PulseArrow />
            <FlowStep icon={Mic} label="Explain out loud" />
            <PulseArrow />
            <FlowStep icon={Sparkles} label="Get gaps filled" />
          </div>
        </Reveal>
      </section>

      {/* Sections 2 → 5 share one scroll-drawn squiggle that winds from
          "The illusion of competence" all the way down to the waitlist. */}
      <div ref={journeyRef} className="relative w-full">
        <ScrollSquiggle target={journeyRef} />

        {/* ── Section 2: The Illusion of Competence ─────────────────── */}
        <section className="w-full px-6 py-24">
          <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
                The illusion of competence
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <div className="flex max-w-prose flex-col gap-5 text-lg text-[#A1A1AA]">
                <p>
                  Rereading feels like learning. The material looks familiar, so
                  your brain files it as known. But recognition is not recall,
                  and exams only test recall.
                </p>
                <p>
                  The gaps stay hidden until you explain the idea in your own
                  words. TeachItBack is built around that moment.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Section 3: Bento Grid ───────────────────────────────────── */}
        <section className="relative w-full px-6 py-24">
          {/* Glow orbs BEHIND the glass cards — these make the blur visible */}
          <GlowOrb className="top-16 left-[22%] h-80 w-80" />
          <GlowOrb className="bottom-16 right-[18%] h-96 w-96" />

          <div className="relative mx-auto grid w-full max-w-4xl gap-8 md:grid-cols-3 md:grid-rows-2">
            <Reveal delay={0} className="md:col-span-1 md:row-span-2">
              <GlassCard className="flex h-full flex-col justify-between gap-6 p-6">
                <div>
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
                </div>
                <LiveTranscript />
              </GlassCard>
            </Reveal>

            <Reveal delay={80} className="md:col-span-2 md:row-span-1">
              <GlassCard className="flex h-full flex-col justify-between gap-4 p-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Gaps get filled, not just flagged
                  </h3>
                  <p className="mt-2 max-w-prose text-sm text-[#A1A1AA]">
                    Skip a step and a short correction appears right where you
                    needed it.
                  </p>
                </div>
                <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-[#A1A1AA]">
                  the Calvin cycle{" "}
                  <span className="rounded bg-brand px-1.5 py-0.5 text-xs font-medium text-white">
                    + fixes CO₂ into glucose
                  </span>
                </p>
              </GlassCard>
            </Reveal>

            <Reveal delay={160} className="md:col-span-1 md:row-span-1">
              <GlassCard className="flex h-full flex-col justify-between gap-4 p-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Built from your sources
                  </h3>
                  <p className="mt-2 text-sm text-[#A1A1AA]">
                    Upload what you already have.
                  </p>
                </div>
                <div className="flex gap-4 text-[#A1A1AA]">
                  <FileText aria-label="PDF documents" className="size-5" />
                  <Film aria-label="Video recordings" className="size-5" />
                  <Presentation aria-label="Slide decks" className="size-5" />
                </div>
              </GlassCard>
            </Reveal>

            <Reveal delay={240} className="md:col-span-1 md:row-span-1">
              <GlassCard className="flex h-full flex-col justify-between gap-4 p-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Then builds you a plan
                  </h3>
                  <p className="mt-2 text-sm text-[#A1A1AA]">
                    Your gap report becomes a short plan: review, practice, or
                    mastered.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {PLAN_ITEMS.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs"
                    >
                      <span className="truncate text-[#A1A1AA]">
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          item.status === "Review"
                            ? "bg-brand text-white"
                            : "bg-white/[0.08] text-[#A1A1AA]",
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </Reveal>
          </div>
        </section>

        {/* ── Section 4: How it works, in detail ──────────────────────── */}
        <section className="relative w-full px-6 py-24">
          <Reveal className="mx-auto mb-20 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-[#A1A1AA]">
              Click record, speak, learn.
            </p>
          </Reveal>

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
              title="Teach it back, out loud"
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
            <WaitlistLead />
          </Reveal>
        </section>

        {/* ── Section 5: Waitlist / Footer ────────────────────────────── */}
        <section className="relative flex w-full flex-col items-center px-6 py-24">
          <GlowOrb className="top-0 left-1/2 h-80 w-[40rem] -translate-x-1/2" />

          <Reveal className="relative flex flex-col items-center text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
              Be first to try it
            </h2>
            <p className="mt-4 max-w-md text-lg text-[#A1A1AA]">
              Join the waitlist and we&apos;ll email you when it&apos;s ready.
            </p>
          </Reveal>

          <Reveal delay={120} className="relative mt-10 w-full max-w-md">
            <WaitlistCta />
          </Reveal>
        </section>
      </div>

      <footer className="w-full border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between text-sm text-[#71717A]">
          <span className="font-medium text-[#A1A1AA]">TeachItBack</span>
          <span>© 2026 TeachItBack</span>
        </div>
      </footer>
    </main>
  );
}

const PLAN_ITEMS: Array<{ label: string; status: string }> = [
  { label: "Electron transport chain", status: "Review" },
  { label: "Calvin cycle", status: "Practice" },
  { label: "Light reactions", status: "Mastered" },
];

function Nav() {
  return (
    <header className="flex w-full items-center justify-between border-b border-white/10 px-8 py-5">
      <span className="text-base font-semibold tracking-tight text-white">
        TeachItBack
      </span>
      <Button
        asChild
        size="sm"
        className="bg-brand font-semibold text-white transition-transform hover:bg-brand/90 active:scale-[0.98]"
      >
        <a href="#waitlist">Join waitlist</a>
      </Button>
    </header>
  );
}

/* Low-opacity blurred blue orb. Positioned absolutely inside a relative
   section, always behind content — this is what makes the glass cards read
   as glass. */
function GlowOrb({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
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
    <div className={cn("glass glass-lift rounded-2xl", className)}>
      {children}
    </div>
  );
}

/* Arrow between hero flow steps. Nudges along its own axis; the outer span
   carries the mobile rotation so the nudge follows the arrow's direction. */
function PulseArrow() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <span aria-hidden className="inline-block rotate-90 text-brand sm:rotate-0">
      <motion.span
        className="block"
        animate={shouldReduceMotion ? undefined : { x: [0, 5, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <ArrowRight className="size-5" />
      </motion.span>
    </span>
  );
}

/* One winding line drawn across sections 2 → 5 as the user scrolls. It
   weaves left and right, ducking behind the glass cards it crosses, and
   ends at the waitlist form. The viewBox stretches to the wrapper's size;
   vectorEffect keeps the stroke width constant. */
const SQUIGGLE_PATH = [
  "M 150 22",
  "C 400 55, 740 40, 810 130",
  "C 870 210, 420 200, 260 265",
  "C 120 320, 660 315, 725 415",
  "C 770 490, 300 475, 240 565",
  "C 190 640, 690 620, 735 705",
  "C 770 780, 560 790, 520 825",
  "C 470 870, 310 860, 285 905",
  "C 265 950, 420 975, 500 985",
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

/* Animated cue at the end of "How it works" leading down to the waitlist. */
function WaitlistLead() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <a
      href="#waitlist"
      className="group flex flex-col items-center gap-3 text-sm font-medium text-[#A1A1AA] transition-colors hover:text-white"
    >
      Ready when you are
      <motion.span
        aria-hidden
        animate={shouldReduceMotion ? undefined : { y: [0, 6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="glass flex size-10 items-center justify-center rounded-full transition-colors group-hover:border-white/25"
      >
        <ChevronDown className="size-5 text-brand" />
      </motion.span>
    </a>
  );
}

function FlowStep({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="glass flex size-14 items-center justify-center rounded-2xl">
        <Icon aria-hidden className="size-6 text-brand" />
      </div>
      <span className="text-sm font-medium whitespace-nowrap text-[#A1A1AA]">
        {label}
      </span>
    </div>
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
        <div className="relative w-full max-w-sm flex-1">
          <GlassCard className="min-h-56">{mockup}</GlassCard>
        </div>
      </div>
    </Reveal>
  );
}

const TRANSCRIPT_WORDS = [
  "...and",
  "that",
  "energy",
  "turns",
  "directly",
  "into",
  "glucose.",
];

function LiveTranscript() {
  const { ref, visibleWords, done } = useTypewriter(TRANSCRIPT_WORDS, 140);

  return (
    <div
      ref={ref}
      className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
    >
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
        {visibleWords.join(" ")}
        {!done && (
          <span aria-hidden className="text-brand">
            |
          </span>
        )}
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
        <p className="text-white">
          &ldquo;...energy turns directly into glucose.&rdquo;
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

function WaitlistCta() {
  const [stage, setStage] = useState<Stage>("form");
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("waitlist_signups")
      .insert({
        email: email.trim().toLowerCase(),
        learning_goal: goal || null,
      });

    setSubmitting(false);

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "That email is already on the list."
          : "Something went wrong. Try again.",
      );
      return;
    }

    setStage("done");
  }

  return (
    <div
      id="waitlist"
      className="flex min-h-24 w-full scroll-mt-24 flex-col items-center justify-start"
    >
      {stage === "form" && (
        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col gap-4 rounded-2xl border border-white/10 bg-[#171717] p-6 shadow-xl shadow-black/40"
        >
          <div className="flex flex-col gap-3">
            <Input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 border-[#333333] bg-[#1E1E1E] text-base text-white placeholder:text-[#71717A]"
            />
            <Input
              type="text"
              placeholder="What are you trying to learn?"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="h-11 border-[#333333] bg-[#1E1E1E] text-base text-white placeholder:text-[#71717A]"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-center text-xs text-[#71717A]">
            We&apos;ll only email you when TeachItBack is ready.
          </p>
          <Button
            type="submit"
            size="default"
            disabled={submitting}
            className="bg-brand font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand)] transition-transform hover:bg-brand/90 active:scale-[0.98]"
          >
            {submitting ? "Joining…" : "Join the Waitlist"}
          </Button>
        </form>
      )}

      {stage === "done" && (
        <p className="text-sm text-[#A1A1AA]">
          You&apos;re on the list. We&apos;ll email you.
        </p>
      )}
    </div>
  );
}
