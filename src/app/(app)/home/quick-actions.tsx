import { FileText, Mic, Plus } from "lucide-react";
import Link from "next/link";

/**
 * The three things anyone opens this app to do, at the top of the page.
 *
 * The home screen used to be a greeting and then a wall of topic tiles, which
 * assumes you arrived knowing which topic you wanted and what you meant to do
 * with it. Most of the time you arrive knowing only the second half — you want
 * to explain something, or you want to see what you got wrong last time — and
 * every one of those routes already exists as its own address. They were just
 * reachable only from the nav, which is a menu you have to read.
 *
 * Written as verbs with a sentence under each rather than icons with a label,
 * because the difference between "record" and "gaps" is not obvious from a
 * microphone and a document.
 *
 * In the app register: a white card on the near-white canvas, the soft tinted
 * elevation, a mono kicker on each row, and the accent carried by the one
 * action that is the point of the screen. The other two are cards, not filled
 * buttons, because three filled buttons in a row is three primary actions,
 * which is none.
 */
const ACTIONS = [
  {
    href: "/new",
    kicker: "New",
    title: "Start a topic",
    lede: "Upload your material and a course gets built from it.",
    icon: Plus,
    primary: true,
  },
  {
    href: "/record",
    kicker: "Three minutes",
    title: "Explain something",
    lede: "Talk through a topic you already have. Marked as you speak.",
    icon: Mic,
    primary: false,
  },
  {
    href: "/gapreport",
    kicker: "Last session",
    title: "See what you missed",
    lede: "Claim by claim, with what to do about each one.",
    icon: FileText,
    primary: false,
  },
] as const;

export function QuickActions() {
  return (
    <nav
      aria-label="What would you like to do"
      data-tour="actions"
      className="grid gap-3 sm:grid-cols-3"
    >
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          /* Each card rises on its own beat — three actions arriving left to
             right read as being dealt, not as one block appearing. */
          data-rise=""
          className={
            action.primary
              ? "press group flex flex-col gap-2 rounded-card bg-accent-solid p-6 text-accent-contrast shadow-rest transition-[background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-accent-solid-hover hover:shadow-hover"
              : /* The landing's frosted panel and its lift, so the blocks
                   somebody hovered before signing up behave the same after. */
                "press group panel-live glass-panel flex flex-col gap-2 rounded-card p-6"
          }
        >
          <span className="flex items-center gap-2">
            <action.icon
              className={
                action.primary
                  ? "size-4 shrink-0"
                  : "size-4 shrink-0 text-[color:var(--accent-solid)]"
              }
            />
            <span
              className={
                action.primary
                  ? "font-mono text-[0.68rem] uppercase tracking-[0.09em] opacity-85"
                  : "font-mono text-[0.68rem] text-subtle uppercase tracking-[0.09em]"
              }
            >
              {action.kicker}
            </span>
          </span>
          <span
            className={
              action.primary
                ? "font-semibold text-[1.12rem] leading-tight"
                : "font-semibold text-[1.12rem] text-strong leading-tight"
            }
          >
            {action.title}
          </span>
          <span
            className={
              action.primary
                ? "text-[0.88rem] leading-relaxed opacity-90"
                : "text-[0.88rem] text-subtle leading-relaxed"
            }
          >
            {action.lede}
          </span>
        </Link>
      ))}
    </nav>
  );
}
