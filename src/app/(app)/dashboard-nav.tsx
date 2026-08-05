"use client";

import { motion } from "framer-motion";
import { ChevronDown, House, Mic, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";

/* Sentence case, not Title Case. Every other label in the product is written
   the way a sentence is, and "Gap Report" / "Re-Teach" were the only two
   shouting — which also made them the two longest items in the row.

   Three destinations, not five. Gaps and Re-teach were here as peers of Home
   and Record, which said they were places you go. They are not: both are what
   you read *after* a recording, about a specific topic, and both are already
   the last two rows of the running order on Home and the tabs inside a topic.
   Listing them a third time in the top-level bar meant the same four verbs
   appeared in two competing navigations, and neither one was obviously the
   real one.

   What is left is the shape of the product: Home is where your topics are,
   Record is the thing you came to do, Settings is Settings. Everything about
   a topic lives inside that topic. */
const ITEMS = [
  { href: "/home", label: "Home", icon: House },
  { href: "/record", label: "Record", icon: Mic },
  { href: "/settings", label: "Settings", icon: Settings },
];

type NavItem = (typeof ITEMS)[number];

function isActive(pathname: string, href: string) {
  // "/home" is a prefix of every course URL, so it needs an exact match or it
  // stays lit on every page in the app.
  return href === "/home" ? pathname === "/home" : pathname.startsWith(href);
}

export function DashboardNav({ showAdmin = false }: { showAdmin?: boolean }) {
  const pathname = usePathname();
  const layoutId = useId();
  const items: NavItem[] = showAdmin
    ? [...ITEMS, { href: "/admin", label: "Admin", icon: ShieldCheck }]
    : ITEMS;
  const current = items.find((item) => isActive(pathname, item.href));

  return (
    <>
      {/*
        Below `md` the row collapsed into five or six unlabelled icons packed
        against the logo — a strip of glyphs with no way to tell which is
        which, on the screens with the least room to guess. One button naming
        the page you are on says more than all six did, and the destinations
        arrive with their labels attached.
      */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={
            current ? `Menu. Currently on ${current.label}` : "Open menu"
          }
          /* `min-w-0` is load-bearing. The header's left group carries
             `min-w-0` so it can shrink, which means a child that refuses to
             shrink does not get clipped — it overflows the group and paints
             over whatever is beside it. That is how the New topic button
             ended up sitting on top of this trigger on a phone. With this,
             the label truncates instead. */
          className="flex min-w-0 items-center gap-1.5 rounded-control border border-border bg-card px-3 py-2 font-medium text-sm text-strong shadow-rest transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)] md:hidden"
        >
          {current ? (
            <>
              <current.icon className="size-4 shrink-0" />
              <span className="truncate">{current.label}</span>
            </>
          ) : (
            <span>Menu</span>
          )}
          <ChevronDown aria-hidden className="size-3.5 shrink-0 text-subtle" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-48">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5",
                    active && "font-medium text-strong",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <nav className="hidden items-center gap-1 md:flex">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                /* `whitespace-nowrap` is load-bearing: without it "Gap Report"
                   and "Re-Teach" wrap to two lines as soon as the row is
                   tight, which makes those two items twice the height of the
                   other four and the whole bar ragged. */
                "relative flex items-center gap-2 whitespace-nowrap rounded-control px-2.5 py-2 font-medium text-sm transition-colors duration-200 lg:px-3",
                /* The active item is the one place in the shell the accent
                   appears. Everything else in the bar is ink or grey, so
                   "where am I" is answered by the only colour on screen. */
                active
                  ? "text-[color:var(--accent-solid)]"
                  : "text-subtle hover:text-strong",
              )}
            >
              {/* Shared layout id: the active pill slides between tabs instead
                  of disappearing and reappearing. */}
              {active && (
                <motion.span
                  layoutId={layoutId}
                  transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                  className="absolute inset-0 rounded-control bg-accent-wash"
                />
              )}
              <Icon className="relative size-4" />
              <span className="relative hidden xl:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
