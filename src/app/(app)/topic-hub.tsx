import { ArrowRight, Mic } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { courseHref } from "~/lib/folders";
import { requireUser } from "~/lib/supabase/server";
import { cn } from "~/lib/utils";

type Hub = {
  /** The course sub-page these tiles link to. */
  path: "record" | "gaps" | "re-teach";
  title: string;
  lede: string;
  /**
   * Whether a topic is worth linking to before anything has been recorded.
   * Recording is; a gap report with no recording behind it is an empty page
   * with an explanation of why it is empty, which is worse than being told
   * here.
   */
  needsRecording: boolean;
};

/**
 * The "pick a topic" screen behind `/record`, `/gapreport` and `/reteach`.
 *
 * These addresses exist because they are the three things anyone actually
 * comes here to do, and each used to be reachable only by opening a topic
 * first. Same list, same shape, different destination — so one component,
 * rather than three files that drift apart.
 */
export async function TopicHub({ path, title, lede, needsRecording }: Hub) {
  const { supabase, user } = await requireUser();

  const [{ data: courses }, { data: graded }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, topic, slug")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<Array<{ id: string; topic: string; slug: string | null }>>(),
    // Which topics have something to show. One query for every course rather
    // than one per course: the list is small, and a fan-out here would be a
    // round trip per tile for a boolean.
    supabase
      .from("course_sessions")
      .select("course_id, score, started_at")
      .eq("user_id", user.id)
      .not("analyzed_at", "is", null)
      .order("started_at", { ascending: false })
      .returns<
        Array<{ course_id: string; score: number | null; started_at: string }>
      >(),
  ]);

  // Newest first from the query, so the first row seen for a course is its
  // most recent graded recording.
  const latest = new Map<string, number | null>();
  for (const session of graded ?? []) {
    if (!latest.has(session.course_id)) {
      latest.set(session.course_id, session.score);
    }
  }

  if (!courses?.length) {
    return (
      <Shell title={title} lede={lede}>
        <Card className="glass flex flex-col items-start gap-4 rounded-2xl border-0 bg-transparent p-6">
          <p className="text-sm text-subtle">
            You don&apos;t have any topics yet. Start one, and everything here
            fills in as you explain it.
          </p>
          <Button
            asChild
            className="h-10 rounded-full bg-brand px-5 text-white"
          >
            <Link href="/new">Start a topic</Link>
          </Button>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell title={title} lede={lede}>
      <div className="flex flex-col gap-3">
        {courses.map((course) => {
          const score = latest.get(course.id);
          const recorded = latest.has(course.id);
          const reachable = recorded || !needsRecording;
          const href = reachable
            ? `${courseHref(course)}/${path}`
            : `${courseHref(course)}/record`;

          return (
            <Link key={course.id} href={href} className="group">
              <Card
                className={cn(
                  "glass glass-lift flex flex-row items-center justify-between gap-4",
                  "rounded-2xl border-0 bg-transparent p-4",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-strong">
                    {course.topic}
                  </p>
                  <p className="mt-0.5 text-xs text-subtle">
                    {recorded
                      ? `Last recording · ${score ?? "—"}/100`
                      : "Nothing recorded yet. Explain it once to see this"}
                  </p>
                </div>
                {reachable ? (
                  <ArrowRight className="size-4 shrink-0 text-brand transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
                ) : (
                  <Mic className="size-4 shrink-0 text-subtle" />
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </Shell>
  );
}

function Shell({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-strong">
          {title}
        </h1>
        <p className="mt-2 text-foreground">{lede}</p>
      </div>
      {children}
    </div>
  );
}
