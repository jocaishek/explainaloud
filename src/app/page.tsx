import { LandingRedesign } from "~/components/landing/landing-redesign";

/**
 * The landing page.
 *
 * This file used to be 1704 lines: nine components — a masthead, a hero, a
 * running order, a marking demo, a pace section, a sources section, a try-it
 * section, a close and a footer — plus their helpers, none of which rendered.
 * `Home` returned `<LandingRedesign />` and nothing else. What kept the other
 * 1685 lines from being reported as unused was a single statement:
 *
 *     void [Masthead, Hero, RunningOrder, ...];
 *
 * with a comment saying the previous implementation was being kept "while
 * this visual direction is being reviewed". The review concluded — the
 * redesign is the landing page, and has been through several rounds of
 * changes since — but the statement stayed, and so did every line it was
 * holding up. Nothing imports them: they are local declarations in a file
 * whose only export is this component.
 *
 * It was not free. A dead masthead sitting one screen above the live one is a
 * trap: an edit to the wordmark landed in the dead copy and changed nothing a
 * visitor could see, which cost a round of "why has the page not updated".
 * Dead code that merely sits there is a maintenance cost; dead code that
 * *looks* like the thing you are trying to edit is a bug generator.
 *
 * If the old direction is ever wanted again it is in the history, which is
 * what history is for.
 */
export default function Home() {
  return <LandingRedesign />;
}
