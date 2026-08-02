import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "~/lib/utils";

/**
 * The three things anyone opens this app to do.
 *
 * **Not three cards.** This was a row of three equal rounded boxes, which is
 * the layout the landing page is explicitly forbidden to use and for the same
 * reason: three identical containers say the three things inside them are
 * interchangeable, and these are not — they are one sequence. You put material
 * in, you explain it, you read back what you missed. A card grid flattens an
 * order into a menu.
 *
 * So it is built the way the landing builds its running order: a lettered
 * gutter, hairline rules instead of card edges, and the duration on the right.
 * Reading down the column gives you the loop in the order you do it, which is
 * also the answer to "what is this app" for somebody on their first visit.
 *
 * **The copy is what actually happens.** The old lines were three restatements
 * of "do a thing here" at the same pitch — "Upload your material and a course
 * gets built from it", "Talk through a topic you already have". Each row now
 * says what you give it, what comes back, and how long it takes, because that
 * is the information somebody is choosing between.
 *
 * The accent appears once, on the first step, and only as an inked rule and a
 * filled arrow. One primary action per screen; the other two are the same row
 * without the paint.
 */
const ACTIONS = [
  {
    href: "/new",
    n: "A",
    title: "Start a topic",
    detail:
      "Slides, a chapter or your notes — PDF, Word, Markdown, HTML, CSV or LaTeX. Agents draft a short course and audit each other, and every claim comes back tied to a quote from your files.",
    dur: "2:30",
    primary: true,
  },
  {
    href: "/record",
    n: "B",
    title: "Explain it out loud",
    detail:
      "Three minutes on a topic you already have, talking the way you would to someone who has never met it. Claims turn green, amber or red while you are still speaking.",
    dur: "3:00",
    primary: false,
  },
  {
    href: "/gapreport",
    n: "C",
    title: "Read back the gaps",
    detail:
      "Every claim you got right, every one too vague to check, and the steps you never reached — each with what to do about it, and your pace against your own baseline.",
    dur: "1:00",
    primary: false,
  },
] as const;

export function QuickActions() {
  return (
    <nav aria-label="What would you like to do" data-tour="actions">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          data-rise=""
          className={cn(
            "press group grid grid-cols-[1.75rem_1fr_auto] items-start gap-x-4 border-t py-5",
            "transition-colors duration-200",
            action.primary
              ? "border-t-[color:var(--accent-solid)]"
              : "border-border hover:border-[color:var(--accent-solid)]",
          )}
        >
          <span
            className={cn(
              "pt-1 font-mono text-[0.68rem] uppercase tracking-[0.09em]",
              action.primary ? "text-brand-ink" : "text-subtle",
            )}
          >
            {action.n}
          </span>

          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="font-semibold text-[1.08rem] text-strong leading-tight">
                {action.title}
              </span>
              <ArrowRight
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1",
                  action.primary ? "text-brand-ink" : "text-subtle",
                )}
              />
            </span>
            <span className="mt-2 block max-w-[62ch] text-[0.88rem] text-subtle leading-relaxed">
              {action.detail}
            </span>
          </span>

          <span className="pt-1 font-mono text-[0.68rem] text-subtle uppercase tabular-nums tracking-[0.09em]">
            {action.dur}
          </span>
        </Link>
      ))}
    </nav>
  );
}
