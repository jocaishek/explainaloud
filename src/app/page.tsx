"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useInView } from "~/hooks/use-in-view";
import { useTypewriter } from "~/hooks/use-typewriter";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

type Stage = "idle" | "form" | "done";

const EASE = "ease-[cubic-bezier(0.23,1,0.32,1)]";

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={cn(
        `transition-[opacity,transform] duration-700 ${EASE} motion-reduce:transition-opacity motion-reduce:duration-300`,
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-3 opacity-0 motion-reduce:translate-y-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative flex min-w-[1024px] flex-col items-center overflow-x-auto px-6 py-24">
      <BackgroundGlow />

      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <Reveal>
          <p className="text-sm font-medium text-muted-foreground">
            TeachItBack
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
            Know when you actually understand it.
          </h1>
        </Reveal>
      </div>

      <div className="mt-20 flex w-full max-w-4xl flex-row items-start justify-center gap-3">
        <Reveal delay={80} className="flex flex-col items-center gap-3">
          <BrowserCard className="w-[220px]">
            <SourcesPanel />
          </BrowserCard>
          <p className="text-sm font-medium text-foreground">
            From your own sources
          </p>
        </Reveal>

        <Reveal
          delay={160}
          className="flex items-center justify-center pt-16 text-[var(--color-cerulean)]"
        >
          <FlowArrow />
        </Reveal>

        <Reveal delay={240} className="flex flex-col items-center gap-3">
          <BrowserCard className="w-[220px]">
            <ExplainPanel />
          </BrowserCard>
          <p className="text-sm font-medium text-foreground">
            Explain it out loud
          </p>
        </Reveal>

        <Reveal
          delay={320}
          className="flex items-center justify-center pt-16 text-[var(--color-cerulean)]"
        >
          <FlowArrow />
        </Reveal>

        <Reveal delay={400} className="flex flex-col items-center gap-3">
          <BrowserCard className="w-[220px]">
            <GapPanel />
          </BrowserCard>
          <p className="text-sm font-medium text-foreground">
            See exactly what stuck
          </p>
        </Reveal>
      </div>

      <div className="mt-40 flex w-full max-w-4xl flex-col gap-8">
        <TintSection tint="bg-[var(--color-yale)]/[0.05]">
          <FeatureRow
            reverse={false}
            heading="Built from what you're already studying"
            description="Upload your own textbooks, lectures, or slides. TeachItBack turns them into a structured course in minutes."
          >
            <CourseBuilderVisual />
          </FeatureRow>
        </TintSection>

        <TintSection tint="bg-[var(--color-cerulean)]/[0.06]">
          <FeatureRow
            reverse
            heading="Just talk. We'll transcribe it live."
            description="Explain the concept out loud. Your words appear on screen in real time as you speak."
          >
            <SpeechToTextVisual />
          </FeatureRow>
        </TintSection>

        <TintSection tint="bg-[var(--color-rosewood)]/[0.05]">
          <FeatureRow
            reverse={false}
            heading="Gaps get filled, not just flagged"
            description="When your explanation skips a step, TeachItBack fills it in with a short, clear definition."
          >
            <ReviewVisual />
          </FeatureRow>
        </TintSection>
      </div>

      <Reveal delay={0} className="mt-32">
        <WaitlistCta />
      </Reveal>
    </main>
  );
}

function BackgroundGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] overflow-hidden"
    >
      <div className="absolute -top-32 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[var(--color-frost)] opacity-[0.18] blur-3xl" />
    </div>
  );
}

function TintSection({
  tint,
  children,
}: {
  tint: string;
  children: React.ReactNode;
}) {
  return <div className={cn("rounded-3xl px-12 py-16", tint)}>{children}</div>;
}

function BrowserCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-black/5",
        className,
      )}
    >
      <div className="h-[3px] w-full bg-gradient-to-r from-[var(--color-rosewood)] via-[var(--color-cerulean)] to-[var(--color-frost)]" />
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
        <div className="flex gap-1">
          <span className="size-1.5 rounded-full bg-[var(--color-rosewood)]/70" />
          <span className="size-1.5 rounded-full bg-[var(--color-frost)]" />
          <span className="size-1.5 rounded-full bg-[var(--color-cerulean)]/70" />
        </div>
        <div className="flex-1 rounded-full bg-background px-2 py-0.5 text-center text-[9px] text-muted-foreground">
          teachitback.app
        </div>
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

function FeatureRow({
  heading,
  description,
  reverse,
  children,
}: {
  heading: string;
  description: string;
  reverse: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 items-center gap-16",
        reverse && "[&>*:first-child]:order-2",
      )}
    >
      <Reveal className="flex justify-center">{children}</Reveal>
      <Reveal delay={80} className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {heading}
        </h2>
        <p className="max-w-sm text-muted-foreground">{description}</p>
      </Reveal>
    </div>
  );
}

function FlowArrow() {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative, aria-hidden
    <svg width="28" height="16" viewBox="0 0 28 16" fill="none" aria-hidden>
      <path
        d="M1 8h21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M17 2l7 6-7 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function SourcesPanel() {
  return (
    <div className="flex flex-col gap-1.5">
      {["Textbook.pdf", "Lecture.mp4", "Slides.key"].map((label) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-[11px] text-muted-foreground"
        >
          <span className="size-1 rounded-full bg-[var(--color-cerulean)]" />
          {label}
        </div>
      ))}
      <div className="mt-1 rounded-md bg-[var(--color-cerulean)]/10 px-2 py-1.5 text-[11px] font-medium text-[var(--color-cerulean)]">
        Course ready · Photosynthesis
      </div>
    </div>
  );
}

function ExplainPanel() {
  return (
    <div className="flex flex-col gap-2 text-[11px]">
      <p className="text-muted-foreground">
        &ldquo;Plants convert sunlight into chemical energy.&rdquo;
      </p>
      <p className="text-muted-foreground">
        &ldquo;That happens in the chloroplasts.&rdquo;
      </p>
      <div className="rounded-md bg-brand/10 p-2">
        <p className="text-foreground">
          &ldquo;...energy turns directly into glucose.&rdquo;
        </p>
        <p className="mt-1 font-medium text-brand">
          Flagged: what do you mean by &ldquo;directly&rdquo;?
        </p>
      </div>
    </div>
  );
}

function GapPanel() {
  const { ref, visible } = useInView<HTMLDivElement>();
  const rows: Array<{ label: string; pct: number; color: string }> = [
    { label: "Light reactions", pct: 92, color: "var(--color-cerulean)" },
    { label: "Calvin cycle", pct: 54, color: "var(--color-frost)" },
    { label: "Electron transport", pct: 28, color: "var(--color-rosewood)" },
  ];

  return (
    <div ref={ref} className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div key={row.label} className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground">{row.label}</span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ${EASE}`}
              style={{
                width: visible ? `${row.pct}%` : "0%",
                backgroundColor: row.color,
                transitionDelay: `${i * 100}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CourseBuilderVisual() {
  const { ref, visible } = useInView<HTMLDivElement>();
  const sources = [
    { label: "Textbook.pdf", color: "var(--color-yale)" },
    { label: "Lecture.mp4", color: "var(--color-cerulean)" },
    { label: "Slides.key", color: "var(--color-rosewood)" },
  ];
  const modules = [
    "Light-dependent reactions",
    "Calvin cycle",
    "Electron transport chain",
  ];

  return (
    <BrowserCard className="w-full max-w-sm">
      <div ref={ref} className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {sources.map((s) => (
            <span
              key={s.label}
              className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-yale)] via-[var(--color-cerulean)] to-[var(--color-frost)] transition-[width] duration-1000"
            style={{
              width: visible ? "100%" : "0%",
              transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)",
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          {modules.map((m, i) => (
            <div
              key={m}
              className={`flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-[11px] text-foreground transition-[opacity,transform] duration-500 ${EASE}`}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(6px)",
                transitionDelay: `${600 + i * 90}ms`,
              }}
            >
              <span className="size-1.5 rounded-full bg-[var(--color-cerulean)]" />
              {m}
            </div>
          ))}
        </div>
      </div>
    </BrowserCard>
  );
}

const BAR_COLORS = [
  "var(--color-yale)",
  "var(--color-cerulean)",
  "var(--color-frost)",
  "var(--color-cerulean)",
  "var(--color-rosewood)",
];

function SpeechToTextVisual() {
  const words = [
    "Plants",
    "convert",
    "sunlight",
    "into",
    "chemical",
    "energy",
    "using",
    "chlorophyll.",
  ];
  const { ref, visibleWords, done } = useTypewriter(words, 130);

  return (
    <BrowserCard className="w-full max-w-sm">
      <div ref={ref} className="flex flex-col gap-4">
        <div className="flex h-10 items-end justify-center gap-1.5">
          {BAR_COLORS.map((color, i) => (
            <span
              key={color + i.toString()}
              className="waveform-bar w-1.5 rounded-full"
              style={{
                height: "2.25rem",
                backgroundColor: color,
                animationDelay: `${i * 90}ms`,
              }}
            />
          ))}
        </div>
        <p className="min-h-[3.5rem] text-sm text-foreground">
          {visibleWords.join(" ")}
          {!done && (
            <span aria-hidden className="text-[var(--color-cerulean)]">
              |
            </span>
          )}
        </p>
      </div>
    </BrowserCard>
  );
}

function ReviewVisual() {
  return (
    <BrowserCard className="w-full max-w-sm">
      <p className="text-[13px] leading-relaxed text-foreground">
        Photosynthesis happens in the chloroplasts, where{" "}
        <span className="rounded bg-[var(--color-cerulean)]/15 px-1 text-[var(--color-cerulean)]">
          light-dependent reactions
        </span>{" "}
        produce ATP and NADPH. That energy is then used in{" "}
        <span className="rounded bg-brand/15 px-1 font-medium text-brand">
          the Calvin cycle
        </span>
        <span className="ml-1 inline-block rounded-md bg-brand px-1.5 py-0.5 align-middle text-[10px] font-medium text-brand-foreground">
          + fixes CO₂ into glucose
        </span>
        , which this explanation skipped.
      </p>
    </BrowserCard>
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
      .insert({ email, learning_goal: goal || null });

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
    <div className="flex min-h-24 w-[26rem] flex-col items-center justify-start">
      {stage === "form" && (
        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/5"
        >
          <div className="flex flex-col gap-2.5">
            <Input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 text-base"
            />
            <Input
              type="text"
              placeholder="What are you trying to learn?"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="h-11 text-base"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            size="sm"
            disabled={submitting}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {submitting ? "Joining…" : "Join the waitlist"}
          </Button>
        </form>
      )}

      {stage === "done" && (
        <p className="text-sm text-muted-foreground">
          You&apos;re on the list. We&apos;ll email you.
        </p>
      )}
    </div>
  );
}
