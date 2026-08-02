import type * as React from "react";

import { cn } from "~/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        /* The one card in the product.
         *
         * Geometry comes from tokens, never literals: 20px radius, a hairline
         * at 8% of the text colour, and a two-layer shadow tinted with that
         * same hue rather than pure black - which is the difference between a
         * card that reads as lifted and one that looks smudged.
         *
         * Separation is carried by the border and by the single step from the
         * #FAFAFB page to white. The shadow is nearly subliminal at rest, so a
         * grid of these reads as quiet rather than as a pile of panels.
         *
         * The lift on hover is one pixel of translation, not a scale. Scaling
         * a card resamples the text inside it, and blurry type under the
         * cursor is what separates a cheap hover from a polished one. */
        "flex flex-col gap-6 rounded-[var(--r-card)] border border-[var(--border)] bg-card p-7 text-card-foreground shadow-[var(--shadow-card)]",
        "transition-[transform,box-shadow,border-color] duration-[var(--dur)] ease-[var(--ease)]",
        "hover:-translate-y-px hover:border-[rgba(17,24,39,0.12)] hover:shadow-[var(--shadow-card-hover)]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
