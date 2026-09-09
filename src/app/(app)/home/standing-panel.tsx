import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { StreakFlame } from "~/components/streak-flame";
import { SlidingNumber } from "~/components/ui/sliding-number";
import { nextMilestone, WEEK_DAYS } from "~/lib/streak";
import { cn } from "~/lib/utils";

/**
 * Where this account stands, in one panel beside the greeting.
 *
 * This replaces three stacked full-width blocks — a streak band, a ruled row
 * of three totals, and the pace panel's empty state — which between them took
 * about nine hundred pixels of the dashboard to say "no streak, three
 * explanations, one topic, not enough data to chart yet". None of that is
 * work; it is the page describing itself, and it sat directly in the path of
 * the only thing on the screen that belongs to the reader.
 *
 * So it moves out of the column and into the corner. The header is a greeting
 * and one factual line, which leaves the right-hand third of that row empty on
 * any wide screen — the summary goes there, and the page below it starts with
 * the topics.
 *
 * **The figures lose their captions, and that is the compaction.** In the
 * ruled row each number carried a line saying what it counted, which was
 * right at that size and is what made the row 250px tall. Two of the three
 * captions only restated the label ("Topics" / "Courses built from your own
 * material"). The third carried something real — that the rate has the pauses
 * taken out — and that sentence still exists, in the pace panel that draws the
 * chart. What is left here is a label a person reads once.
 */

export type WeekDay = {
  /** `yyyy-mm-dd` in the reader's own timezone. */
  day: string;
  sessions: number;
  is_today: boolean;
};

export type Figure = {
  label: string;
  value: number;
  /** Rendered after the number, at label size. */
  unit?: string;
  /** False before there is anything to count, which draws a dash instead. */
  measured: boolean;
};

export function StandingPanel({
  streak,
  week,
  figures,
  className,
}: {
  streak: number;
  week: WeekDay[];
  figures: Figure[];
  className?: string;
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
      aria-labelledby="standing-heading"
      className={cn(
        "rounded-card border border-border bg-card p-5 shadow-rest",
        className,
      )}
    >
      <h2 id="standing-heading" className="sr-only">
        Where you stand
      </h2>

      {/* Wide and short, not narrow and tall.
       *
       * The first version of this panel stacked its four blocks down a 22rem
       * column and came out 400px deep beside a 92px greeting — which put
       * three hundred pixels of nothing between the lede and the topics, and
       * read as a layout that had lost a block rather than one that had been
       * compacted. A summary in the corner has to be about as tall as the
       * thing it sits next to, so the streak and the week share a row and the
       * panel is a band rather than a card standing on its end. */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        {/* The streak keeps its scale relative to everything else here. It
            was the loudest thing on the page and it is still the loudest
            thing in this panel, which is the property that mattered: it is
            the one number that changes today. It is no longer the loudest
            thing on the dashboard, because the dashboard is the topics. */}
        <div className="flex items-center gap-3.5">
          <StreakFlame
            size="lg"
            className={cn("shrink-0", streak === 0 && "opacity-30 saturate-0")}
          />
          <p className="flex min-w-0 items-baseline gap-2">
            <SlidingNumber
              value={streak}
              /* No line-height override. `SlidingNumber` sizes its digit
                 windows off the line box, so tightening the leading here
                 crops the numeral's own baseline — the component sets
                 `leading-none` itself. */
              className="font-display text-[2.25rem] text-strong tracking-[-0.045em]"
            />
            <span className="font-medium text-[0.85rem] text-subtle">
              {streak === 1 ? "day in a row" : "days in a row"}
            </span>
          </p>
        </div>

        {/* Sunday to Saturday, fixed, and days after today are drawn empty.
         *
         * A rolling seven days is the more defensible window and the wrong one
         * to draw: people know where they are in a week, and a grid whose first
         * column means a different day each time they look is a grid whose
         * labels have to be read every time. Hiding the days still to come
         * would make the row change width as the week goes on, and a Wednesday
         * showing four cells reads as a week that ended badly rather than one
         * that is half done.
         *
         * A fixed gap rather than `justify-between`: the week now shares its
         * row with the streak, so it is a cluster sitting at the right-hand end
         * of the band rather than a rule spanning it. */}
        <ol className="flex items-center gap-1.5">
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
                    /* Circles, still. Squares at the control radius read as
                     seven cells of a table, which is what a week is not. */
                    "streak-day flex size-7 items-center justify-center rounded-pill border font-medium text-[0.72rem]",
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
      </div>

      {/* No milestone rail here, and the omission is the compaction.
       *
       * The full-width band drew one under the days: a `--flame` bar and a
       * "3 of 7" beside it, measuring the run against the next milestone. Two
       * progress indicators stacked is one too many in a card this size —
       * seven circles already draw where the week stands, and a second bar
       * under them reads as the same fact in a different visual language.
       * The distance to the next stop survives in the sentence below, which
       * is where it was always said in words. */}
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.82rem] text-subtle leading-relaxed">
        {caption}
        {/* Only while today is still open. An action offered after it has
            been taken is an action that does nothing, and this line is the
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

      {/* The three totals, ruled off rather than boxed.
       *
       * `flex-col-reverse` so the figure reads above its label while the
       * markup keeps the `dt`/`dd` order a description list requires — the
       * label is what names the number, and a screen reader should reach it
       * first whatever the paint order is. */}
      <dl className="mt-5 grid grid-cols-3 gap-x-3 border-border border-t pt-4">
        {figures.map((figure) => (
          <div key={figure.label} className="flex flex-col-reverse gap-1">
            <dt className="text-[0.75rem] text-subtle">{figure.label}</dt>
            <dd className="flex items-baseline gap-1">
              <span
                className={cn(
                  "font-medium text-[1.5rem] leading-none tracking-[-0.04em] tabular-nums",
                  figure.measured ? "text-strong" : "text-subtle",
                )}
              >
                {/* Not a zero. A big 0 reads as a score, and somebody who has
                    not recorded yet has not scored badly — they have not
                    started. */}
                {figure.measured ? figure.value : "—"}
              </span>
              {figure.measured && figure.unit && (
                <span className="text-[0.72rem] text-subtle">
                  {figure.unit}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
