import Link from "next/link";
import { cn } from "~/lib/utils";

/**
 * The three things anyone opens this app to do, side by side.
 *
 * This was a stacked column of ruled rows. The argument for it was that three
 * identical containers say the things inside them are interchangeable, and
 * these are not — they are one sequence. That is still true, and it is why the
 * order is stated rather than implied: each card is numbered 01, 02, 03, and
 * the numeral is the largest thing on it. Reading left to right is reading the
 * order you do it in, and reading the numerals alone gives you the loop.
 *
 * What the column got wrong was the copy. Each row carried three lines of
 * prose at the same pitch, so the page opened with eighty words of explanation
 * before the first topic, and readers reported it as confusing rather than
 * thorough. A card is a smaller box and a smaller box is a budget: one line
 * per step, naming what you give it and what comes back. The rest of what
 * those paragraphs said belongs on the page that does the thing, where
 * somebody has already chosen to be.
 *
 * **What keeps three boxes from looking generated.** The stock feature grid
 * has a tell, and it is the same every time: an icon in a circle, everything
 * centred, three interchangeable grey paragraphs, equal weight across all
 * three. So — no icons at all, because a glyph per box is the loudest part of
 * that pattern and the numeral already does the job. Everything ranged left.
 * The duration stays, because a real number is specific in a way a generated
 * one never is, and because "how long will this take" is the actual question
 * somebody is asking. The accent lands once, on step one, as a rule across the
 * top and nothing else — one primary action on screen, and two cards that are
 * plainly the same object without the paint.
 */
const ACTIONS = [
  {
    href: "/new",
    n: "01",
    title: "Start a topic",
    detail: "Upload your notes. A short course gets built from them.",
    dur: "2:30",
    primary: true,
  },
  {
    href: "/record",
    n: "02",
    title: "Explain it out loud",
    detail: "Three minutes, no notes. Claims are marked while you speak.",
    dur: "3:00",
    primary: false,
  },
  {
    href: "/gaps",
    n: "03",
    title: "Read back the gaps",
    detail: "What you got right, what was vague, what you never reached.",
    dur: "1:00",
    primary: false,
  },
] as const;

export function QuickActions() {
  return (
    <nav aria-label="What would you like to do" data-tour="actions">
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ACTIONS.map((action) => (
          <li key={action.href} className="flex" data-rise="">
            <Link
              href={action.href}
              className={cn(
                "press group flex w-full flex-col rounded-card border bg-card p-4 shadow-rest",
                "transition-[border-color,box-shadow] duration-200 ease-out",
                "hover:shadow-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]",
                /* The accent is a rule across the top of the first card, drawn
                   with a thicker top border rather than an extra element, so
                   the three boxes stay the same size to the pixel. */
                action.primary
                  ? "border-border border-t-2 border-t-[color:var(--accent-solid)]"
                  : "border-border hover:border-[color:var(--accent-solid)]",
              )}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span
                  className={cn(
                    "font-mono text-[1.35rem] leading-none tabular-nums",
                    action.primary ? "text-brand-ink" : "text-subtle",
                  )}
                >
                  {action.n}
                </span>
                <span className="font-mono text-[0.68rem] text-subtle uppercase tabular-nums tracking-[0.09em]">
                  {action.dur}
                </span>
              </span>

              <span className="mt-4 font-semibold text-[1.02rem] text-strong leading-tight">
                {action.title}
              </span>
              {/* Each title is one line at every width these cards reach, so
                  the sentences land on a common baseline without help. If a
                  title ever wraps, this needs `mt-auto` and the titles need a
                  min-height — three boxes whose text starts at different
                  heights is half of what makes a row look unconsidered. */}
              <span className="mt-1.5 text-[0.85rem] text-subtle leading-relaxed">
                {action.detail}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
