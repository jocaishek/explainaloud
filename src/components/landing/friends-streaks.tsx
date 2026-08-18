import { StreakFlame } from "~/components/streak-flame";
import { WEEK_DAYS } from "~/lib/streak";
import { cn } from "~/lib/utils";

/**
 * One band, and it is the shortest section on the page.
 *
 * The brief was to put friends and streaks on the landing without making the
 * landing longer, which rules out the version of this that every product page
 * reaches for: three cards, three icons, three sentences about accountability.
 * So it is a single row. The argument is on the left in two lines and the
 * thing itself is on the right, drawn with the same component the dashboard
 * draws it with, so what somebody sees here is literally what they get.
 *
 * The two handles are authored and obviously so. `design.md` bans invented
 * proof on this page, and it means it: no counts of users, no testimonials, no
 * names of real people. A demonstration panel is allowed, and it is allowed
 * exactly because nobody will mistake Obi-Wan Kenobi for a customer.
 */

/** Which days of the week the example has filled in. Sunday first. */
const EXAMPLE_WEEK = [false, true, true, true, true, false, false] as const;
/** Which cell is "today" in the example. Friday, so the week reads as unfinished. */
const EXAMPLE_TODAY = 5;

const EXAMPLE_FRIENDS = [
  { name: "Obi-Wan Kenobi", handle: "obiwankanobi", topics: 12, streak: 9 },
  { name: "Ada Lovelace", handle: "countess_ada", topics: 7, streak: 4 },
] as const;

export function FriendsAndStreaks() {
  return (
    <section
      data-scroll-reveal
      className="border-border border-y bg-card px-5 py-20 md:px-8 md:py-24"
    >
      <div className="mx-auto grid max-w-[76rem] items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
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

        {/* The artefact. Square and ruled, like everything else on this page. */}
        <div className="border border-border">
          <div className="flex items-center justify-between gap-4 border-border border-b p-5">
            <div className="flex items-center gap-3">
              <StreakFlame size="md" />
              <div>
                <p className="font-medium text-[1.35rem] text-strong leading-none tracking-[-0.03em] tabular-nums">
                  5 days
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
            {EXAMPLE_FRIENDS.map((friend) => (
              <li
                key={friend.handle}
                className="flex items-center gap-3 p-5 text-sm"
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
                    <StreakFlame size="sm" />
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
