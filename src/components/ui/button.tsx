import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "~/lib/utils";

/* Pills, and a press.
 *
 * The landing page's action is a pill in sans at a readable size with a 3%
 * scale on `:active`, and there is no reason for the same action inside the
 * app to be a small square-cornered rectangle that does not answer when you
 * push it. Changing the shared variant rather than each call site is what
 * keeps the two halves of the product looking like one product. */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ease-out outline-none active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      /* Every filled variant reads `--accent-solid`, which is ink on the
         landing and the app's blue behind the sign-in. That is the whole
         reason these are tokens: one primary button component, two correct
         answers, no `className` override at the call site deciding which. */
      variant: {
        default:
          "bg-accent-solid text-accent-contrast shadow-rest hover:bg-accent-solid-hover",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-[color:var(--input)] bg-card shadow-rest hover:bg-muted dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground dark:hover:bg-accent/50",
        link: "text-[color:var(--accent-solid)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-5 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-full px-2.5 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-full px-3.5 has-[>svg]:px-2.5",
        lg: "h-10 rounded-full px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
