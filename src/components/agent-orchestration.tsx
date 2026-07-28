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
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-strong">
                    {agent.role}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      agent.status === "queued" &&
                        "bg-muted-foreground/10 text-subtle",
                      agent.status === "running" && "bg-brand/15 text-brand",
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
