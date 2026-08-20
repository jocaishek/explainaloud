"use client";

import { useEffect, useState } from "react";
import { StreakFlame } from "~/components/streak-flame";
import { useInView } from "~/hooks/use-in-view";
import { WEEK_DAYS } from "~/lib/streak";
import { cn } from "~/lib/utils";

/**
 * One band, and it is the shortest section on the page.
 *
 * The brief was to put friends and streaks on the landing without making the
 * landing longer, which rules out the version every product page reaches for:
 * three cards, three icons, three sentences about accountability. So it is a
 * single row. The argument is on the left in two lines and the thing itself is
 * on the right, drawn with the same component the dashboard draws it with, so
 * what somebody sees here is literally what they get.
 *
 * The row underneath is a real account and a real handle, and it is the one
 * belonging to whoever built this. `design.md` bans invented proof on this
 * page and means it: no counts of users, no testimonials, no names of people
 * who did not agree to be there. A demonstration panel is allowed, and this
 * one is allowed because there is no claim in it — a founder's own handle is
 * not evidence that anybody else is here.
 *
 * **The numbers in it have to agree with each other.** An earlier version
 * showed four filled days under a heading reading "5 days", which is the one
 * thing a demonstration of a counter may not do — a reader who checks is a
 * reader who has just been told the product cannot count. Authored material is
 * still material, and it is held to what the real component would render.
 */

/* Sunday through Thursday, which is five days, which is what the panel says.
   Today is Thursday, so the run includes it and Friday and Saturday have not
   happened yet. Every one of those three facts is checkable against the row
   beside it, and that is the point. */
const EXAMPLE_WEEK = [true, true, true, true, true, false, false] as const;
const EXAMPLE_TODAY = 4;

/**
 * The figure, counted from the row rather than typed next to it.
 *
 * This is the fix for the bug, not the corrected number. A literal `5` beside
 * a hand-maintained array is a promise that whoever edits one edits the other,
 * and that promise had already been broken once. Counting backwards from today
 * while the days are filled is the same rule `current_streak` runs in SQL, so
 * the panel cannot disagree with itself again however the week is edited.
 */
const EXAMPLE_STREAK = (() => {
  let run = 0;
  for (let i = EXAMPLE_TODAY; i >= 0 && EXAMPLE_WEEK[i]; i -= 1) run += 1;
  return run;
})();

/**
 * One row, and it is the account that ships the thing.
 *
 * This was two invented people, and the reasoning above it was that nobody
 * would mistake Obi-Wan Kenobi for a customer. That reasoning still holds and
 * this is not a retreat from it — it is the other way of satisfying the same
 * rule. `design.md` bans invented proof; a handle that belongs to whoever
 * built the product is not proof of anything and is not invented, so there is
 * nothing here for a reader to be wrong about.
 *
 * The streak is seven and the reader's own, in the header above, is five. That
 * ordering is deliberate: the panel exists to show what a friend's run looks
 * like from your side, and a friend who is behind you demonstrates nothing.
 */
const EXAMPLE_FRIENDS = [
  { name: "Jovanny Shek", handle: "jovannyshek", topics: 12, streak: 7 },
] as const;

/**
 * When the flames catch, relative to the panel arriving.
 *
 * `BASE_MS` clears the section's own reveal. The two run concurrently
 * otherwise, and a flame that plays its arrival while the panel it sits in is
 * still fading up is a flame nobody sees arrive — the animation happens, at
 * eight per cent opacity, and the effect is simply absent. `STAGGER_MS` is
 * roughly a beat, so the panel lights rather than flashes.
 */
const BASE_MS = 430;
const STAGGER_MS = 240;

export function FriendsAndStreaks() {
  const { ref, visible } = useInView<HTMLElement>();

  return (
    <section
      ref={ref}
      data-scroll-reveal
      className="border-border border-y bg-card px-5 py-24 md:px-8 md:py-28"
    >
      <div className="mx-auto grid max-w-[76rem] items-center gap-12 lg:grid-cols-[1fr_0.68fr] lg:gap-20">
        <div>
          <p className="font-mono text-[0.67rem] text-brand-ink uppercase tracking-[0.14em]">
            Keep at it
          </p>
          {/* The emphasis is weight and colour, on the half of the sentence
              that is the actual proposition. `design.md`: there is no italic
              in this type system, and a second face at display size reads as
              a different voice rather than as stress. */}
          <h2 className="mt-5 max-w-[16ch] font-display text-[clamp(1.9rem,4.2vw,3.8rem)] text-strong leading-[1.02] tracking-[-0.04em]">
            A run of days, and{" "}
            <span className="text-brand-ink">someone who can see it</span>.
          </h2>
          <p className="mt-7 max-w-[34rem] text-muted-foreground leading-relaxed">
            Every day you explain something out loud adds one to your streak,
            counted where you actually are rather than where the server is. Add
            a friend by their username and you each see two things about the
            other: how many topics they have built, and how long their run is.
            Nothing else, and nothing you have said.
          </p>
        </div>

        {/* The artefact. Square and ruled, like everything else on this page.
            `min-w-0` because a grid item defaults to `min-width: auto`, which
            means it refuses to shrink below its content — and the row inside
            has a `shrink-0` group on the right, so at 390px the panel was
            quietly ~40px wider than its track and the topic count was being
            cut off by the page's own `overflow-x`. Nothing scrolled and
            nothing warned; the number was simply not there. */}
        <div className="min-w-0 border border-border">
          <div /* Stacked until there is room, which is what `StreakStrip` does on the
                 dashboard for the same reason: the count and seven day chips
                 come to about 394px, and a phone is 390. Side by side, the
                 last chip of the week was being cut off by the page's own
                 `overflow-x` — silently, because nothing scrolled to reveal
                 it. */
            className="flex flex-col gap-4 border-border border-b p-5 sm:flex-row sm:items-center sm:justify-between md:p-6"
          >
            <div className="flex items-center gap-3">
              <ArrivingFlame visible={visible} delay={BASE_MS} size="md" />
              <div>
                <p className="whitespace-nowrap font-medium text-[1.35rem] text-strong leading-none tracking-[-0.03em] tabular-nums">
                  {EXAMPLE_STREAK} days
                </p>
                <p className="mt-1 text-[0.78rem] text-muted-foreground">
                  in a row
                </p>
              </div>
            </div>
            <ol className="flex items-center gap-1.5">
              {WEEK_DAYS.map((day, index) => {
                const filled = EXAMPLE_WEEK[index];
                return (
                  <li key={day.key}>
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-7 items-center justify-center border font-medium text-[0.68rem]",
                        filled
                          ? "border-transparent bg-brand-ink text-card"
                          : "border-border text-muted-foreground",
                        index > EXAMPLE_TODAY && "opacity-40",
                      )}
                    >
                      {day.letter}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <ul className="divide-y divide-border">
            {EXAMPLE_FRIENDS.map((friend, index) => (
              <li
                key={friend.handle}
                className="flex items-center gap-3 p-5 text-sm md:p-6"
              >
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-ink/10 font-medium text-[0.72rem] text-brand-ink"
                >
                  {friend.name
                    .split(" ")
                    .map((part) => part.at(0))
                    .join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-strong">
                    {friend.name}
                  </span>
                  <span className="block truncate font-mono text-[0.7rem] text-muted-foreground">
                    @{friend.handle}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-4 text-right">
                  <span className="flex items-center gap-1.5">
                    <ArrivingFlame
                      visible={visible}
                      delay={BASE_MS + STAGGER_MS * (index + 1)}
                      size="sm"
                    />
                    <span className="font-medium text-strong tabular-nums">
                      {friend.streak}
                    </span>
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {friend.topics} topics
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/**
 * A flame that catches when the panel reaches the reader, and then stops.
 *
 * `catch` rather than `arrive`, and the difference is the whole robustness
 * argument. The arrival used here first began at zero opacity, which meant the
 * flame had to be hidden until the trigger fired — and the trigger is an
 * IntersectionObserver, which does not fire at all while a tab is in the
 * background or its window is occluded. A reader who opened the page in a
 * background tab and came to it later would have found three blank gaps where
 * the flames are. Decoration that can fail to appear is worse than decoration
 * that never moves.
 *
 * So the flame is always drawn, at full strength, from the server render
 * onwards. The observer only ever *adds* motion. If it never fires, the panel
 * is simply a still picture of itself, which is exactly what it was before.
 *
 * `useInView` disconnects after the first intersection, so scrolling past
 * again does not re-light it. A shape that re-animates every time it crosses
 * the fold is the decoration this product bans everywhere else.
 */
function ArrivingFlame({
  visible,
  delay,
  size,
}: {
  visible: boolean;
  delay: number;
  size: "sm" | "md";
}) {
  const [lit, setLit] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setLit(true), delay);
    return () => clearTimeout(timer);
  }, [visible, delay]);

  return <StreakFlame lit={lit} arrival="catch" size={size} />;
}
