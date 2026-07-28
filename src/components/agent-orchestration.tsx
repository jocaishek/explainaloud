"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { AgentRun } from "~/lib/ai/schemas";
import { cn } from "~/lib/utils";

type DisplayAgent = {
  id: string;
  role: string;
  summary: string;
  status: "queued" | "running" | "completed" | "revised" | "degraded";
  provider?: "gemini" | "groq" | "local";
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

  const heading = (
    <>
      <h2 className="font-mono text-[10px] tracking-[0.16em] text-brand uppercase">
        Agent orchestration
      </h2>
      <span className="min-w-0 truncate text-xs text-subtle">
        {running ? `${PIPELINE_LABELS[pipeline]} · live` : run?.strategy}
      </span>
    </>
  );

  return (
    <section
      aria-label="Agent orchestration"
      aria-live={running ? "polite" : undefined}
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface",
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
            <span className="font-mono text-[9px] tracking-[0.08em] text-subtle uppercase">
              {agents.length} agents
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

      {open && (
        <ol className="grid sm:grid-cols-2 xl:grid-cols-5">
          {agents.map((agent, index) => (
            <li
              key={agent.id}
              className={cn(
                "relative min-w-0 px-4 py-3",
                // Dividers follow the grid: a top border on every row after the
                // first, a left border on every column after the first. Hard-coded
                // `md:border-l` on all-but-one drew a line down the wrong edges
                // once the row wrapped.
                index > 0 && "border-t border-border sm:border-t-0",
                index >= 2 && "sm:border-t sm:border-border",
                index >= 5 && "xl:border-t xl:border-border",
                "sm:[&:not(:nth-child(odd))]:border-l sm:[&:not(:nth-child(odd))]:border-border",
                "xl:[&:not(:first-child)]:border-l xl:[&:not(:first-child)]:border-border",
                agent.status === "running" && "bg-brand/[0.04]",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    agent.status === "queued" && "bg-muted-foreground/35",
                    agent.status === "running" && "animate-pulse bg-brand",
                    agent.status === "completed" && "bg-emerald-500",
                    agent.status === "revised" && "bg-amber-500",
                    agent.status === "degraded" && "bg-amber-500",
                  )}
                />
                <span className="truncate text-sm font-semibold text-strong">
                  {agent.role}
                </span>
                <span
                  className={cn(
                    "ml-auto shrink-0 font-mono text-[9px] tracking-[0.08em] uppercase",
                    agent.status === "running" ? "text-brand" : "text-subtle",
                  )}
                >
                  {STATUS_LABELS[agent.status]}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-subtle">
                {agent.summary}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
