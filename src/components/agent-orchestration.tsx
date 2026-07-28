import type { AgentRun } from "~/lib/ai/schemas";
import { cn } from "~/lib/utils";

type DisplayAgent = {
  id: string;
  role: string;
  summary: string;
  status: "running" | "completed" | "revised" | "degraded";
  provider?: "gemini" | "groq" | "local";
};

const COURSE_AGENTS = [
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
];

export function AgentOrchestration({
  run,
  running = false,
  className,
}: {
  run?: AgentRun | null;
  running?: boolean;
  className?: string;
}) {
  if (!run && !running) return null;

  const agents: DisplayAgent[] = run
    ? run.agents
    : COURSE_AGENTS.map((agent) => ({
        id: agent.role.toLowerCase().replaceAll(" ", "-"),
        role: agent.role,
        summary: agent.task,
        status: "running",
      }));

  return (
    <section
      aria-label="Agent orchestration"
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
          {running ? "Running the specialist handoffs…" : run?.strategy}
        </span>
      </div>

      <ol className="grid md:grid-cols-3">
        {agents.map((agent, index) => {
          return (
            <li
              key={agent.id}
              className={cn(
                "relative min-w-0 px-4 py-3",
                index > 0 && "border-t border-border md:border-t-0 md:border-l",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    agent.status === "running" && "animate-pulse bg-brand",
                    agent.status === "completed" && "bg-emerald-500",
                    agent.status === "revised" && "bg-amber-500",
                    agent.status === "degraded" && "bg-amber-500",
                  )}
                />
                <span className="truncate text-sm font-semibold text-strong">
                  {agent.role}
                </span>
                {agent.provider && (
                  <span className="ml-auto font-mono text-[9px] tracking-[0.1em] text-subtle uppercase">
                    {agent.provider}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-subtle">
                {agent.summary}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
