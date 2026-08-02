import type * as React from "react";

import { cn } from "~/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        /* One input, everywhere.
         *
         * A soft fill rather than a transparent box: on this background an
         * outlined field disappears into the surface it sits on, and the fill
         * is what says "type here" before the border does. It clears to white
         * on focus, so the field being edited is the brightest thing in the
         * form.
         *
         * Roomier than it was - h-11 and 16px of side padding - because the
         * brief asks for a third more breathing room and a control you are
         * meant to aim at is the wrong place to save it. */
        "h-11 w-full min-w-0 rounded-[var(--r-control)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-base outline-none transition-[color,box-shadow,background-color,border-color] duration-[var(--dur)] ease-[var(--ease)] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-[var(--subtle)] hover:bg-[rgba(17,24,39,0.045)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm motion-reduce:transition-none",
        "focus-visible:border-[var(--accent-solid)] focus-visible:bg-[var(--card)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent-ring)]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
