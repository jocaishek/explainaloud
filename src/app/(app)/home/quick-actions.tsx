import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "~/lib/utils";

/**
 * The three things anyone opens this app to do, in the order you do them.
 *
 * These are not three interchangeable features, they are one loop — put
 * material in, explain it out loud, read back what you missed — so the order is
 * stated rather than implied: each row is numbered, and reading the numerals
 * alone gives you the product.
 *
 * **One card of three rows, not three cards.** Three separate boxes side by
 * side say "pick one of these", which is exactly the wrong reading of a
 * sequence, and they force each step's sentence into a column too narrow to
 * hold it. Stacked rows inside a single panel read top to bottom, which is the
 * direction the sequence runs, and they leave the sentence a full line.
 *
 * **What keeps this from looking generated.** The stock feature block has a
 * tell and it is the same every time: an icon in a circle, everything centred,
 * three interchangeable grey paragraphs. So — no icons, because the numeral
 * already does that job. Everything ranged left, one line of copy per step
 * naming what you give it and what comes back. The duration stays, because a
 * real number is specific in a way a generated one never is, and because "how
 * long will this take" is the actual question being asked. The accent lands
 * once, on step one.
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
    <section
      aria-labelledby="quick-actions-heading"
      data-tour="actions"
      className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-rest"
    >
      {/* The heading sits inside the panel rather than above it, so this card
          and the pace panel beside it start on the same line.
          *
          * No total time any more. It read "WHOLE LOOP 6:30", which is a number
          * that answers a question nobody asked at the moment they are deciding
          * whether to begin — and answers it with the largest figure available.
          * Six and a half minutes is the honest sum and it is also the most
          * off-putting way to describe three short steps. The per-step times
          * stay: those are commitments a person can make one at a time, and
          * "3:00" next to "Explain it out loud" is the product's promise
          * rather than a cost. */}
      <div className="p-5 pb-4">
        <h2
          id="quick-actions-heading"
          className="font-mono text-[0.7rem] text-subtle uppercase tracking-[0.12em]"
        >
          Start here
        </h2>
      </div>

      {/* `flex-1` down the list, so the three rows share whatever height the
          panel beside this one sets rather than leaving a band of empty card
          under step three. */}
      <ol className="flex flex-1 flex-col divide-y divide-border border-border border-t">
        {ACTIONS.map((action) => (
          <li key={action.href} className="flex-1">
            <Link
              href={action.href}
              className={cn(
                "press group flex h-full items-center gap-4 px-5 py-4 transition-colors duration-200",
                "hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[color:var(--accent-ring)]",
              )}
            >
              <span
                className={cn(
                  "font-mono text-[1.25rem] leading-none tabular-nums",
                  action.primary ? "text-brand-ink" : "text-subtle",
                )}
              >
                {action.n}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[1rem] text-strong leading-tight">
                  {action.title}
                </span>
                <span className="mt-1 block text-[0.85rem] text-subtle leading-relaxed">
                  {action.detail}
                </span>
              </span>

              <span className="hidden font-mono text-[0.68rem] text-subtle uppercase tabular-nums tracking-[0.09em] sm:inline">
                {action.dur}
              </span>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-subtle transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
