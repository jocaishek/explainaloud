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
 * same kind: the three above it are totals with no shape, and this one is a
 * shape — seven slots, some of them taken, running left to right in the
 * direction the week does. Put in a card grid it would read as another figure
 * to skim past, which is exactly what a streak must not become.
 *
 * Sunday to Saturday, fixed. A rolling seven days is the more defensible
 * window and it is the wrong one to draw: people know where they are in a
 * week, and a grid whose first column means a different day each time they
 * look is a grid they have to read the labels of every time.
 *
 * Days after today are drawn, and drawn empty. Hiding them would make the row
 * change width as the week goes on, and a Wednesday that shows four cells
 * reads as a week that has ended badly rather than one that is half done.
 */
export function StreakStrip({
  streak,
  week,
}: {
  streak: number;
  week: WeekDay[];
}) {
  const todayIndex = week.findIndex((day) => day.is_today);
  const daysThisWeek = week.filter((day) => day.sessions > 0).length;
  const target = nextMilestone(streak);

  const caption =
    streak === 0
      ? daysThisWeek > 0
        ? "Your run ended. One recording starts a new one."
        : "Explain something out loud and the week starts filling in."
      : target
        ? `${target - streak} more ${target - streak === 1 ? "day" : "days"} to reach ${target}.`
        : "Nothing left on the board to chase.";

  return (
    <section
      data-rise=""
      aria-labelledby="streak-heading"
      className="flex flex-col gap-5 rounded-card border border-border bg-card p-5 shadow-rest sm:flex-row sm:items-center sm:justify-between sm:gap-8"
    >
      <div className="flex items-center gap-3.5">
        <StreakFlame
          size="lg"
          className={cn(streak === 0 && "opacity-25 saturate-0")}
        />
        <div>
          <h2
            id="streak-heading"
            className="font-mono text-[0.6rem] text-subtle uppercase tracking-[0.14em]"
          >
            Streak
          </h2>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span
              className={cn(
                "font-medium text-[2.1rem] leading-none tracking-[-0.045em] tabular-nums",
                streak > 0 ? "text-strong" : "text-border",
              )}
            >
              {streak > 0 ? streak : "—"}
            </span>
            <span className="font-medium text-[0.8rem] text-subtle">
              {streak === 1 ? "day in a row" : "days in a row"}
            </span>
          </p>
        </div>
      </div>

      <div className="sm:text-right">
        <ol className="flex items-center gap-1.5 sm:justify-end">
          {week.map((day, index) => {
            const label = WEEK_DAYS[index];
            const recorded = day.sessions > 0;
            /* Not yet happened. Drawn at a third of the weight so the row is
               still seven cells wide without four of them looking missed. */
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
                    "streak-day flex size-8 items-center justify-center rounded-control border font-medium text-[0.72rem]",
                    recorded
                      ? "border-transparent bg-accent-solid text-accent-contrast"
                      : "border-border bg-surface text-subtle",
                    ahead && !recorded && "opacity-40",
                    day.is_today &&
                      "ring-2 ring-[color:var(--accent-ring)] ring-offset-1 ring-offset-card",
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
        <p className="mt-2.5 text-[0.82rem] text-subtle leading-relaxed">
          {caption}
        </p>
      </div>
    </section>
  );
}
