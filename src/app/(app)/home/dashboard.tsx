import { ArrowRight, FileText, Mic } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StreakFlame } from "~/components/streak-flame";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/**
 * The pieces of the home dashboard.
 *
 * Every number here is one the app already records. The design this follows
 * also drew minutes per day, a percentile against other students and a best
 * streak; none of those are stored yet, so they are not drawn — a dashboard
 * that shows an invented figure teaches somebody to distrust the real ones.
 */

/** `yyyy-mm-dd` in the reader's own timezone, with the count for that day. */
export type WeekDay = {
  day: string;
  sessions: number;
  is_today: boolean;
};

export type UpNextItem = {
  key: string;
  /** Why this is suggested, in a few words. */
  why: string;
  tone: "practice" | "fresh" | "again";
  title: string;
  detail: string;
  href: string;
  action: string;
};

/**
 * The page's opening line, and its one action.
 *
 * A plain GET form to `/new`, so the topic typed here arrives pre-filled in
 * the new-topic form with nothing to hydrate: the field is the sentence.
 */
export function TonightForm({ date }: { date: string }) {
  return (
    <form
      action="/new"
      method="get"
      className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm text-subtle">{date}</p>
        <label
          htmlFor="tonight-topic"
          className="mt-2 block font-display text-[2rem] text-strong leading-tight sm:text-[2.5rem]"
        >
          Tonight I&apos;m explaining
        </label>
        <input
          id="tonight-topic"
          name="topic"
          type="text"
          required
          maxLength={200}
          autoComplete="off"
          placeholder="a topic"
          className="mt-1 block w-full max-w-[36rem] border-input border-b-2 bg-transparent pb-1 font-display text-[2rem] text-strong leading-tight outline-none transition-colors placeholder:text-subtle focus:border-[color:var(--accent-solid)] sm:text-[2.5rem]"
        />
      </div>
      <Button type="submit" className="h-12 gap-2 rounded-pill px-5 text-base">
        <Mic aria-hidden strokeWidth={1.5} className="size-[1.1rem]" />
        Start explaining
      </Button>
    </form>
  );
}

/** One number, what it is, and what it compares to. */
export function StatCard({
  label,
  icon,
  value,
  unit,
  note,
}: {
  label: string;
  icon?: ReactNode;
  /** Null draws a dash: not measured yet, which is not the same as zero. */
  value: number | null;
  unit?: string;
  note?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-border bg-card p-5 shadow-rest">
      <p className="flex items-center gap-2 text-sm text-subtle">
        {icon}
        {label}
      </p>
      <p className="mt-3 font-medium text-[2rem] text-strong tabular-nums leading-10 tracking-[-0.02em]">
        {value === null ? "—" : value}
        {value !== null && unit && (
          <span className="ml-1 font-normal text-base text-subtle tracking-normal">
            {unit}
          </span>
        )}
      </p>
      {note && <p className="mt-1 text-sm text-subtle">{note}</p>}
    </div>
  );
}

/** The flame, only when there is a run to show. */
export function StreakIcon({ streak }: { streak: number }) {
  return streak > 0 ? (
    <StreakFlame size="sm" />
  ) : (
    <span aria-hidden className="size-4" />
  );
}

/**
 * This week, as explanations per day.
 *
 * Bars rather than a line: seven separate days compared with each other. Today
 * is the one bar in ink and carries its count; the rest are steps of grey.
 * Counts rather than minutes, because counts are what is stored.
 */
export function WeekCard({ week }: { week: WeekDay[] }) {
  const max = Math.max(3, ...week.map((d) => d.sessions));
  const total = week.reduce((sum, d) => sum + d.sessions, 0);
  return (
    <section
      aria-labelledby="week-heading"
      className="flex flex-col rounded-card border border-border bg-card p-6 shadow-rest"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="week-heading" className="font-medium text-lg text-strong">
          This week
        </h2>
        <span className="text-sm text-subtle">Explanations per day</span>
      </div>
      {week.length === 0 ? (
        <p className="mt-6 text-sm text-subtle">
          Explain something and this week starts filling in.
        </p>
      ) : (
        <ol
          aria-label={`${total} ${total === 1 ? "explanation" : "explanations"} this week`}
          className="mt-8 grid min-h-56 flex-1 grid-cols-7 gap-3"
        >
          {week.map((d) => {
            const label = new Date(`${d.day}T12:00:00`).toLocaleDateString(
              "en-GB",
              { weekday: "short" },
            );
            return (
              <li
                key={d.day}
                className="flex h-full flex-col items-center gap-2"
              >
                {/* The bar's own track, so its height is a share of the same
                    space on every day rather than of whatever the labels
                    leave over. Today's count sits on top of its bar. */}
                <div className="relative flex w-full flex-1 items-end justify-center">
                  <span
                    aria-hidden
                    style={{ height: `${(d.sessions / max) * 100}%` }}
                    className={cn(
                      "relative w-full max-w-10 rounded-control",
                      d.sessions === 0 && "min-h-1",
                      d.is_today ? "bg-accent-solid" : "bg-surface-border",
                    )}
                  >
                    {d.is_today && d.sessions > 0 && (
                      <span className="-translate-x-1/2 absolute bottom-full left-1/2 mb-1.5 font-medium text-strong text-xs tabular-nums">
                        {d.sessions}
                      </span>
                    )}
                  </span>
                </div>
                <span
                  className={cn(
                    "font-mono text-[0.7rem]",
                    d.is_today ? "text-strong" : "text-subtle",
                  )}
                >
                  {d.is_today ? "Today" : label}
                </span>
                <span className="sr-only">
                  {d.sessions}{" "}
                  {d.sessions === 1 ? "explanation" : "explanations"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** What to do next, said plainly, each with one action. */
export function UpNext({ items }: { items: UpNextItem[] }) {
  return (
    <section
      aria-labelledby="up-next-heading"
      className="rounded-card border border-border bg-card p-6 shadow-rest"
    >
      <h2 id="up-next-heading" className="font-medium text-lg text-strong">
        Up next
      </h2>
      <ul className="mt-2">
        {items.map((item) => (
          <li
            key={item.key}
            className="grid gap-1 border-border border-t py-4 first:border-t-0 last:pb-0"
          >
            <span className="flex items-center gap-2 text-subtle text-xs">
              <UpNextMark tone={item.tone} />
              {item.why}
            </span>
            <span className="font-medium text-strong">{item.title}</span>
            <span className="text-sm text-subtle">{item.detail}</span>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-2 w-fit gap-1.5"
            >
              <Link href={item.href}>
                {item.action}
                <ArrowRight
                  aria-hidden
                  strokeWidth={1.5}
                  className="size-3.5"
                />
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* The verdict glyphs, borrowed for their meaning: a dashed ring for something
   not yet said, a filled dot for something already in hand. A new topic gets
   a file, because it is notes that have not been explained yet. */
function UpNextMark({ tone }: { tone: UpNextItem["tone"] }) {
  if (tone === "fresh")
    return <FileText aria-hidden strokeWidth={1.5} className="size-3.5" />;
  return (
    <span
      aria-hidden
      className={cn(
        "size-3 rounded-full",
        tone === "practice"
          ? "border-[1.5px] border-[color:var(--miss)] border-dashed"
          : "bg-ok",
      )}
    />
  );
}
