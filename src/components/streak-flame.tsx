import { cn } from "~/lib/utils";

/**
 * The flame.
 *
 * Drawn rather than set as an icon, because it has to light: the outline, the
 * core and the glow behind them animate on different curves, and a single
 * `<Flame />` glyph is one path that can only be scaled.
 *
 * **It is the accent, not orange.** Every warm value in this product already
 * means something — amber is the verdict for a claim that was said but not in
 * a checkable form, and putting the same colour on a celebration would make
 * the one colour in the app that carries a judgement also the colour of
 * confetti. So the flame is lit in the register's own accent, which is the
 * only non-verdict colour either side of the sign-in is allowed.
 *
 * `lit` runs the arrival once, for about a second, and then stops. A flame
 * that flickers forever in the corner of a page somebody is trying to read is
 * the animation this file exists to avoid.
 */
export function StreakFlame({
  lit = false,
  className,
  size = "md",
}: {
  /** Play the arrival. Ignored under `prefers-reduced-motion`. */
  lit?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      aria-hidden
      data-lit={lit ? "" : undefined}
      className={cn(
        "streak-flame relative inline-flex shrink-0 items-center justify-center",
        size === "sm" && "size-5",
        size === "md" && "size-8",
        size === "lg" && "size-11",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="streak-flame-body size-full"
      >
        <title>Streak</title>
        {/* The body of the flame. One closed path, so the fill and the outline
            are the same shape and there is no seam where they disagree. */}
        <path
          d="M12 2.4c.9 3 2.5 4.3 4 5.9 1.9 2 3 3.9 3 6.3a7 7 0 0 1-14 0c0-2 .8-3.6 1.9-4.9.3 1 .9 1.8 1.8 2.2.5-3.4 1.6-6.6 3.3-9.5Z"
          className="streak-flame-outer"
        />
        {/* The core, which is what flickers. Kept well inside the outline so a
            couple of per cent of scale never breaches it. */}
        <path
          d="M12 12.2c1.4 1.3 2.4 2.5 2.4 4a2.6 2.6 0 0 1-5.1 0c0-1.2.9-2.4 2.7-4Z"
          className="streak-flame-core"
        />
      </svg>
    </span>
  );
}
