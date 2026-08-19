import type * as React from "react";

import { cn } from "~/lib/utils";

/* A card is a surface, not a box drawn around content.
 *
 * Two things carry that, and both are tokens so the same component is correct
 * in both registers: the radius (20px in the app, 0 on the landing) and a
 * hairline tinted with the text colour rather than a grey. The card is a
 * plain ruled block on both sides now.
 *
 * There used to be a third — an elevation of two soft tinted layers — and it
 * is gone everywhere, not just here. A panel with a slab of shadow behind it
 * is the most recognisable generated-interface tell there is, and the product
 * had forty of them. `shadow-rest` is still on this component and still
 * correct: it asks `globals.css` for the register's elevation, and the answer
 * is now none in both.
 *
 * `interactive` is opt-in rather than the default. A card that lifts under the
 * cursor is making a promise that clicking it does something, and most cards
 * here are just panels. */
function Card({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 rounded-card border border-border bg-card py-6 text-card-foreground shadow-rest",
        interactive &&
          "transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-hover",
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
