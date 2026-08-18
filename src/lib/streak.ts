/**
 * What a streak is, said once.
 *
 * A streak here is a run of calendar days on which somebody recorded at least
 * one explanation, counted in their own timezone, and it is derived from the
 * rows in `recording_days` rather than stored anywhere. The database owns the
 * counting (see `current_streak`); this file owns what the number *means* to
 * the person looking at it.
 */

/** Sunday first, because the week the streak is drawn on starts there. */
export const WEEK_DAYS = [
  { key: "sun", letter: "S", full: "Sunday" },
  { key: "mon", letter: "M", full: "Monday" },
  { key: "tue", letter: "T", full: "Tuesday" },
  { key: "wed", letter: "W", full: "Wednesday" },
  { key: "thu", letter: "T", full: "Thursday" },
  { key: "fri", letter: "F", full: "Friday" },
  { key: "sat", letter: "S", full: "Saturday" },
] as const;

/**
 * The days that get the bigger arrival.
 *
 * Sparse on purpose, and it thins out as the numbers climb. Celebrating every
 * day makes day forty as loud as day one, and a signal that never varies stops
 * being a signal — which is the failure mode of every streak feature that
 * people end up muting.
 */
const MILESTONES = new Set([3, 7, 14, 30, 50, 75, 100, 150, 200, 365]);

export function isMilestone(streak: number): boolean {
  return MILESTONES.has(streak);
}

/** The next number worth aiming at, or null once they are all behind you. */
export function nextMilestone(streak: number): number | null {
  const ahead = [...MILESTONES]
    .filter((day) => day > streak)
    .sort((a, b) => a - b);
  return ahead[0] ?? null;
}

export type StreakEvent = {
  /** Days in a row, including today. */
  streak: number;
  /** The local date the recording was filed under, `yyyy-mm-dd`. */
  day: string;
  /** How many recordings that day now holds. */
  sessions: number;
  /** False on the second and later recordings of the same day. */
  isFirstToday: boolean;
};

/** The name of the window event a finished recording dispatches. */
export const STREAK_EVENT = "explainaloud:streak";

export type StreakNotice = {
  title: string;
  body: string;
  /** A milestone gets a longer, larger arrival. Day one is one of them. */
  big: boolean;
};

/**
 * What to say about a streak that has just moved, or `null` to say nothing.
 *
 * Nothing is the common case and it is the important one. The toast fires on
 * the *first* recording of a day, because that is the only recording that
 * changes the number — somebody working through four topics on a Sunday
 * afternoon has started one streak, not four, and being told about it four
 * times is how a nice moment becomes furniture.
 */
export function streakNotice(event: StreakEvent): StreakNotice | null {
  if (!event.isFirstToday) return null;
  const { streak } = event;

  if (streak <= 0) return null;

  if (streak === 1) {
    return {
      title: "Streak started",
      body: "One day down. Explain something tomorrow and it becomes two.",
      big: true,
    };
  }

  if (streak === 2) {
    return {
      title: "Two days in a row",
      body: "One more makes it a habit rather than a coincidence.",
      big: false,
    };
  }

  const big = isMilestone(streak);
  const next = nextMilestone(streak);

  return {
    title: `${streak} days in a row`,
    body: big
      ? next
        ? `That is a real run. Next one worth chasing is ${next}.`
        : "There is nothing left on the board to chase. Well done."
      : next
        ? `${next - streak} more to reach ${next}.`
        : "Keep going.",
    big,
  };
}

/**
 * How the streak reads on a page rather than in a notification.
 *
 * Zero is not "0 days". Somebody who has never recorded has not failed at a
 * streak, and somebody whose streak lapsed on Thursday does not need a figure
 * telling them so in the same type size as the rest of their progress.
 */
export function streakLabel(streak: number): string {
  if (streak <= 0) return "No streak yet";
  if (streak === 1) return "1 day";
  return `${streak} days`;
}
