import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { StreakFlame } from "~/components/streak-flame";
import { nextMilestone, WEEK_DAYS } from "~/lib/streak";
import { cn } from "~/lib/utils";

export type WeekDay = {
  /** `yyyy-mm-dd` in the reader's own timezone. */
  day: string;
  sessions: number;
  is_today: boolean;
};

/**
 * The week, and how long the run is.
 *
 * A band rather than a fourth stat card, because it is not a number of the
 * same kind: the three below it are totals with no shape, and this one is a
 * shape — seven slots, some of them taken, running left to right in the
 * direction the week does.
 *
 * **It is allowed to be the loudest thing on the page.** An earlier version
 * put the figure at the same size as everything else under a tracked
 * uppercase label reading STREAK, and it disappeared: the one number here
 * that changes today, drawn as though it were an audit field. A streak is
 * the emotional part of a study tool and it either looks like it or it is
 * furniture. So the number is set at display size, the flame is large enough
 * to be a picture rather than a bullet, and the days are circles — because
 * seven squares in a row is a bar chart and seven circles is a week.
 *
 * **No machine voice.** `design.md` reserves tracked uppercase mono for
 * metadata and timecodes, and names a region of a page as the thing it must
 * never be. The sentence says what the number is, in words, at a size a
 * person reads.
 *
 * Sunday to Saturday, fixed. A rolling seven days is the more defensible
 * window and it is the wrong one to draw: people know where they are in a
 * week, and a grid whose first column means a different day each time they
 * look is a grid they have to read the labels of every time. Days after today
 * are drawn, and drawn empty — hiding them would make the row change width as
 * the week goes on, and a Wednesday showing four cells reads as a week that
 * ended badly rather than one that is half done.
 */
export function StreakStrip({
  streak,
  week,
}: {
  streak: number;
  week: WeekDay[];
}) {
  const todayIndex = week.findIndex((day) => day.is_today);
  const recordedToday =
    todayIndex >= 0 && (week[todayIndex]?.sessions ?? 0) > 0;
  const anyThisWeek = week.some((day) => day.sessions > 0);
  const target = nextMilestone(streak);

  /* Four states, and each names the next thing rather than congratulating
     anybody for arriving. The middle two are the ones that matter: a run that
     is still alive but has not been fed today is the only moment where a
     nudge is worth anything. */
  const caption = recordedToday
    ? target
      ? `Recorded today. ${target - streak} more ${target - streak === 1 ? "day" : "days"} to reach ${target}.`
      : "Recorded today, and there is nothing left on the board to chase."
    : streak > 0
      ? `Still going. Record today and it becomes ${streak + 1}.`
      : anyThisWeek
        ? "Your run ended. One recording starts a new one."
        : "Explain something out loud and the week starts filling in.";

  return (
    <section
      data-rise=""
      aria-labelledby="streak-heading"
      className="flex flex-col gap-6 rounded-card border border-border bg-card p-6 shadow-rest sm:flex-row sm:items-center sm:justify-between sm:gap-10"
    >
      <div className="flex items-center gap-4">
        <StreakFlame
          size="xl"
          className={cn(streak === 0 && "opacity-25 saturate-0")}
        />
        <div>
          <h2 id="streak-heading" className="sr-only">
            Your streak
          </h2>
          <p className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-display text-[2.75rem] leading-none tracking-[-0.045em] tabular-nums",
                streak > 0 ? "text-strong" : "text-border",
              )}
            >
              {streak > 0 ? streak : "0"}
            </span>
            <span className="font-medium text-[1.05rem] text-strong">
              {streak === 1 ? "day in a row" : "days in a row"}
            </span>
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.88rem] text-subtle leading-relaxed">
            {caption}
            {/* Only while today is still open. An action offered after it has
                been taken is an action that does nothing, and this row is the
                one place on the page that has to stay true. */}
            {!recordedToday && (
              <Link
                href="/record"
                className="press group inline-flex items-center gap-1 whitespace-nowrap font-medium text-brand-ink underline-offset-4 hover:underline"
              >
                Record now
                <ArrowRight
                  aria-hidden
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                />
              </Link>
            )}
          </p>
        </div>
      </div>

      <ol className="flex items-center gap-2 sm:shrink-0">
        {week.map((day, index) => {
          const label = WEEK_DAYS[index];
          const recorded = day.sessions > 0;
          const ahead = todayIndex >= 0 && index > todayIndex;

          return (
            <li key={day.day}>
              <span
                title={`${label?.full ?? ""}: ${
                  recorded
                    ? `${day.sessions} ${day.sessions === 1 ? "recording" : "recordings"}`
                    : ahead
                      ? "still to come"
                      : "nothing recorded"
                }`}
                className={cn(
                  /* Circles, at the size of a thing you could tap. Squares at
                     the control radius made this read as seven cells of a
                     table, which is what a week is not. */
                  "streak-day flex size-9 items-center justify-center rounded-pill border font-medium text-[0.78rem]",
                  recorded
                    ? "border-transparent bg-accent-solid text-accent-contrast"
                    : "border-border bg-surface text-subtle",
                  ahead && !recorded && "opacity-40",
                  day.is_today &&
                    "ring-2 ring-[color:var(--accent-ring)] ring-offset-2 ring-offset-card",
                )}
              >
                <span aria-hidden>{label?.letter}</span>
                <span className="sr-only">
                  {label?.full}
                  {recorded ? ", recorded" : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
