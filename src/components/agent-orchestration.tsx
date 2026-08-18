"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { AgentRun } from "~/lib/ai/schemas";
import { cn } from "~/lib/utils";

type DisplayAgent = {
  id: string;
  role: string;
  summary: string;
  status:
    | "queued"
    | "running"
    | "completed"
    | "revised"
    | "degraded"
    | "skipped";
  provider?: "gemini" | "groq" | "gateway" | "local";
};

type Pipeline = "course" | "recording";

const PIPELINES: Record<Pipeline, Array<{ role: string; task: string }>> = {
  course: [
    {
      role: "Source Scout",
      task: "Indexes evidence and chooses the grounding mode.",
    },
    {
      role: "Course Architect",
      task: "Builds the lesson and its learning checks.",
    },
    {
      role: "Accuracy Reviewer",
      task: "Audits the draft independently before it is saved.",
    },
    {
      role: "Video Researcher",
      task: "Finds direct English videos matched to the finished lesson.",
    },
    {
      role: "Resource Researcher",
      task: "Finds direct English websites for deeper study.",
    },
  ],
  recording: [
    {
      role: "Transcript Evaluator",
      task: "Checks each claim and locates gaps in the explanation.",
    },
    {
      role: "Gap Coach",
      task: "Turns the evaluation into focused feedback and a next step.",
    },
  ],
};

const STATUS_LABELS: Record<DisplayAgent["status"], string> = {
  queued: "Queued",
  running: "Working",
  completed: "Complete",
  revised: "Revised",
  degraded: "Fallback",
  skipped: "Not needed",
};

const PIPELINE_LABELS: Record<Pipeline, string> = {
  course: "source → architect → independent review",
  recording: "transcript evaluation → gap coaching",
};

function workingAgents(
  pipeline: Pipeline,
  activeIndex: number,
): DisplayAgent[] {
  return PIPELINES[pipeline].map((agent, index) => ({
    id: agent.role.toLowerCase().replaceAll(" ", "-"),
    role: agent.role,
    summary:
      index < activeIndex
        ? `Finished. Handed off to ${PIPELINES[pipeline][index + 1]?.role ?? "the next step"}.`
        : agent.task,
    status:
      index < activeIndex
        ? ("completed" as const)
        : index === activeIndex
          ? ("running" as const)
          : ("queued" as const),
  }));
}

export function AgentOrchestration({
  run,
  running = false,
  pipeline = "course",
  className,
}: {
  run?: AgentRun | null;
  running?: boolean;
  pipeline?: Pipeline;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  // A finished trace is reference material, not the point of the page — the
  // course is. It opens collapsed so five agents' worth of prose doesn't sit
  // above the lesson every visit. A live run is always expanded: watching the
  // handoffs is the whole value while it's happening.
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!running) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex(0);
    const finalIndex = PIPELINES[pipeline].length - 1;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => Math.min(current + 1, finalIndex));
    }, 1800);

    return () => window.clearInterval(timer);
  }, [pipeline, running]);

  if (!run && !running) return null;

  // A new run takes precedence over the persisted result. Otherwise a course
  // rebuild would keep showing the previous completed trace until it finished.
  const agents: DisplayAgent[] = running
    ? workingAgents(pipeline, activeIndex)
    : (run?.agents ?? []);
  const open = running || expanded;

  /* Said in words, to somebody studying.
   *
   * This was "AGENT ORCHESTRATION" in tracked mono capitals, followed by the
   * strategy as a chain of internal role names — "source research → architect
   * → independent review → conditional revision" — and a "6 AGENTS" chip. All
   * of it true, and all of it the machine describing itself to its authors.
   * Nobody revising for a test needs to know how many models were involved,
   * and a page that leads with its own pipeline reads as a demo of the
   * pipeline rather than as a tool.
   *
   * The information is not gone: everything is still one click away, where
   * somebody who wants to know how a claim was checked can go and read it.
   * What changed is that it no longer announces itself first, in the one
   * typeface reserved for metadata, above the actual course. */
  const heading = (
    <>
      <h2 className="font-medium text-[0.9rem] text-strong">
        {running ? "Building this course" : "How this was built"}
      </h2>
      {running && (
        <span className="min-w-0 truncate text-xs text-subtle">
          {PIPELINE_LABELS[pipeline]}
        </span>
      )}
    </>
  );

  return (
    <section
      aria-label="How this course was built"
      aria-live={running ? "polite" : undefined}
      className={cn(
        "overflow-hidden rounded-card border border-border bg-surface",
        className,
      )}
    >
      {running ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-3">
          {heading}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className={cn(
            "flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left transition-colors duration-200 ease-out hover:bg-foreground/[0.03]",
            expanded && "border-b border-border",
          )}
        >
          {heading}
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {/* "6 AGENTS" said nothing a reader could use and everything about
                what built the page. The steps are named inside, in sentences. */}
            <span className="text-[0.78rem] text-subtle">
              {agents.length} {agents.length === 1 ? "step" : "steps"}
            </span>
            <ChevronDown
              aria-hidden
              className={cn(
                "size-3.5 text-subtle transition-transform duration-200 ease-out",
                expanded && "rotate-180",
              )}
            />
          </span>
        </button>
      )}

      {/* One agent per row. Five side-by-side columns squeezed a name, a status
          and a sentence into ~150px each, which is what made this hard to read;
          stacking gives every line the full width it needs. */}
      {open && (
        <ol className="divide-y divide-border">
          {agents.map((agent) => (
            <li
              key={agent.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3.5",
                agent.status === "running" && "bg-brand/[0.04]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  agent.status === "queued" && "bg-muted-foreground/35",
                  agent.status === "running" && "animate-pulse bg-brand",
                  agent.status === "completed" && "bg-emerald-500",
                  agent.status === "revised" && "bg-amber-500",
                  agent.status === "degraded" && "bg-amber-500",
                  agent.status === "skipped" && "bg-muted-foreground/35",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-strong">
                    {agent.role}
                  </span>
                  <span
                    className={cn(
                      "rounded-control px-2 py-0.5 text-[11px] font-medium",
                      (agent.status === "queued" ||
                        agent.status === "skipped") &&
                        "bg-muted-foreground/10 text-subtle",
                      agent.status === "running" &&
                        "bg-brand/15 text-brand-ink",
                      agent.status === "completed" &&
                        "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                      (agent.status === "revised" ||
                        agent.status === "degraded") &&
                        "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {STATUS_LABELS[agent.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-subtle">
                  {agent.summary}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
