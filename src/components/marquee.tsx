import { cn } from "~/lib/utils";

/**
 * Seamless horizontal ticker. Renders the item list twice and slides the track
 * by exactly half its width, so the loop point is invisible. Pure CSS, so it
 * keeps running off the main thread while the page is busy.
 */
export function Marquee({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "marquee group relative flex w-full overflow-hidden",
        // Feather both ends so words dissolve instead of getting clipped.
        "[mask-image:linear-gradient(to_right,transparent,black_6rem,black_calc(100%-6rem),transparent)]",
        className,
      )}
    >
      <div className="marquee-track flex w-max shrink-0 items-center">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 items-center"
          >
            {items.map((item) => (
              <span
                key={item}
                className="flex shrink-0 items-center gap-8 px-8 font-mono text-xs tracking-[0.18em] whitespace-nowrap text-[#71717A] uppercase"
              >
                {item}
                <span aria-hidden className="text-brand">
                  ✦
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
