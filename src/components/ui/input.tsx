import type * as React from "react";

import { cn } from "~/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        /* Taller than the shadcn default, on the card colour rather than
           transparent, and at the control radius. A field that is the same
           colour as the page it sits on relies entirely on its border to be
           findable, which is the thing that made every form here read as a
           wireframe. */
        "h-11 w-full min-w-0 rounded-control border border-input bg-card px-3.5 py-2 text-base outline-none transition-[color,border-color,box-shadow] duration-200 ease-out selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        /* One ring, in the register's accent, and the border going with it —
           a focused field should look focused from across the room. */
        "focus-visible:border-accent-solid focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
