"use client";

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
      task: "Finds direct educational videos matched to the finished lesson.",
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

  return (
    <section
      aria-label="Agent orchestration"
      aria-live={running ? "polite" : undefined}
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <h2 className="font-mono text-[10px] tracking-[0.16em] text-brand uppercase">
          Agent orchestration
        </h2>
        <span className="text-xs text-subtle">
          {running ? `${PIPELINE_LABELS[pipeline]} · live` : run?.strategy}
        </span>
      </div>

      <ol className="grid md:flex">
        {agents.map((agent, index) => (
          <li
            key={agent.id}
            className={cn(
              "relative min-w-0 px-4 py-3 md:flex-1",
              index > 0 && "border-t border-border md:border-t-0 md:border-l",
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
            <p className="mt-1.5 text-xs leading-relaxed text-subtle">
              {agent.summary}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
