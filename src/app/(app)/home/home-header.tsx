import { Greeting } from "~/components/greeting";

/**
 * The top of the dashboard: who is here, and where they stand in one sentence.
 *
 * This replaces a full-bleed dark band carrying a 112px greeting. A dark field
 * is a way of saying "this region is different", and on a dashboard the top of
 * the page is not different — it is the top of the page. What was left after
 * the paint came off was still a monument, and a greeting is not the most
 * important thing on this screen; the work under it is. So the line is set at a
 * size a working screen can carry, and the space that bought goes to a sentence
 * that actually says something.
 *
 * That sentence is written from the data rather than from a copy deck. "Three
 * topics, two explained" is orientation; "Welcome to your dashboard" is a
 * caption on a screenshot.
 */
export function HomeHeader({
  firstName,
  lede,
}: {
  firstName: string;
  /** One factual line about where this account stands. */
  lede: string;
}) {
  /* No kicker over the greeting. It said "DASHBOARD", which is the name of the
     tab already lit in the rail two inches to the left — a label whose only
     content is where you already know you are. */
  return (
    <header data-rise="" className="flex flex-col gap-2.5">
      <Greeting
        name={firstName}
        className="max-w-[22ch] font-semibold text-[clamp(1.6rem,3vw,2.15rem)] text-strong leading-[1.12] tracking-[-0.03em]"
      />
      <p className="max-w-[58ch] text-[0.95rem] text-subtle leading-relaxed">
        {lede}
      </p>
    </header>
  );
}
