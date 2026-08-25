import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { StreakFlame } from "~/components/streak-flame";
import { SlidingNumber } from "~/components/ui/sliding-number";
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
    /* Two regions, not three.
     *
     * The version before this one was a three-column grid — number, meter,
     * week — invented to fill a middle that `justify-between` had left
     * empty. It filled it, and then the card had three weak clusters
     * instead of two strong ones plus a hole, which is not the same as
     * being composed. The meter was the giveaway: a bar measuring the run
     * sitting beside seven circles that already draw the run, saying the
     * same thing twice in two visual languages.
     *
     * So the week absorbs it. The circles are the picture of the streak and
     * the rail is now their footing — label above, days, distance-to-target
     * under — which gives the right-hand region three stacked rows of real
     * structure and leaves the left free to be what it should have been all
     * along: one very large number.
     */
    <section
      data-rise=""
      aria-labelledby="streak-heading"
      className="grid gap-6 rounded-card border border-border bg-card p-6 shadow-rest lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-10"
    >
      {/* Centred again, and now safely: the caption has moved out of this
          block, so its height is the number's height and nothing else. */}
      <div className="flex items-center gap-5">
        <StreakFlame
          size="xl"
          className={cn(
            "mt-1 shrink-0",
            streak === 0 && "opacity-30 saturate-0",
          )}
        />
        <div className="min-w-0">
          <h2 id="streak-heading" className="sr-only">
            Your streak
          </h2>
          {/* The number is the loudest thing on the card, and at zero it is
              still legible. It used to be set in `--border`, an 18%-alpha
              hairline colour meant for drawing edges — so the headline
              figure of the loudest card on the dashboard was the faintest
              mark on the page, and the words beside it were heavier than it
              was. Grey says dormant perfectly well without disappearing. */}
          <p className="flex items-baseline gap-2.5">
            <SlidingNumber
              value={streak}
              className={cn(
                /* No line-height override. `SlidingNumber` sizes its digit
                   windows off the line box, so tightening the leading here
                   cropped the numeral's own baseline — the component already
                   sets `leading-none`. */
                "font-display text-[3.5rem] tracking-[-0.05em]",
                /* Full-strength ink at zero too. Grey said "dormant" and on
                   a dark card it said "illegible" — the largest figure on the
                   dashboard was the hardest thing on it to read. The unlit
                   flame beside it already carries that meaning. */
                "text-strong",
              )}
            />
            <span className="font-medium text-[0.95rem] text-subtle">
              {streak === 1 ? "day in a row" : "days in a row"}
            </span>
          </p>
          {/* Capped measure. Left to itself this line sets on one row and
              pushes the week off the far edge of a narrow window. */}
        </div>
      </div>

      {/* The sentence is its own region, and that is what closes the hole.
       *
       * With the number left and the week right, `justify-between` pushed
       * them to opposite edges of an 1104px card and stretched 342px of
       * nothing between them — the same void the three-column version was
       * built to fix, reintroduced the moment the middle column was taken
       * out. The middle needs real content, and the caption is the only
       * thing on this card that is prose: it grows to whatever space is
       * going, which is exactly what a `1fr` track wants, and unlike the
       * meter it does not restate what the seven circles already draw.
       *
       * On a narrow screen the grid is one column and this simply stacks
       * under the number, which is where it used to live anyway. */}
      <p className="flex max-w-[34rem] flex-wrap items-center gap-x-3 gap-y-1 text-[0.9rem] text-subtle leading-relaxed">
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

      <div className="flex shrink-0 flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-8">
          <p className="text-[0.78rem] text-subtle">This week</p>
          {target ? (
            /* A fraction, because that is what the rail below it draws.
               This read "{target - streak} to {target}", which at a streak
               of zero renders "3 to 3" — two different quantities that
               happen to be equal, printed as though one were the other. */
            <p className="text-[0.78rem] text-subtle tabular-nums">
              <span className="font-medium text-strong">{streak}</span> of{" "}
              {target}
            </p>
          ) : null}
        </div>

        <ol className="flex items-center gap-2">
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

        {/* The run's distance to the next stop, ruled under the days it is
            made of. `--flame` is reserved for the streak and nothing else,
            and this is the streak. Drawn at zero too — an empty rail says
            the run is at nothing and shows how far the first stop is, which
            is the only thing worth knowing there. */}
        {target ? (
          <div
            aria-hidden="true"
            className="h-1 overflow-hidden rounded-pill bg-surface"
          >
            <div
              className="h-full rounded-pill"
              style={{
                width: `${Math.min(100, Math.round((streak / target) * 100))}%`,
                background: "var(--flame)",
              }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
