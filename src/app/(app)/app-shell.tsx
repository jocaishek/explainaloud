"use client";

import { AnimatePresence, motion } from "framer-motion";
import { House, Menu, Mic, Plus, Settings, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { ExplainaloudMark } from "~/components/explainaloud-mark";
import { SignOutButton } from "~/components/sign-out-button";
import { Button } from "~/components/ui/button";
import { type Course, courseHref } from "~/lib/folders";
import { cn } from "~/lib/utils";

/**
 * The app's frame: a rail of tabs down the left, the screen to the right of it.
 *
 * This was a horizontal bar, and the bar was where the product's navigation ran
 * out of room. Three destinations, a wordmark, a primary action, a name and a
 * sign-out all shared one line, so below `xl` the tab labels were dropped and
 * the row became a strip of unlabelled glyphs — the one thing a person new to
 * the app cannot read. Below `md` it collapsed again, into a dropdown naming
 * the page you were already on.
 *
 * A vertical rail has the opposite budget. Height is the cheap axis on a
 * dashboard, so every destination keeps its label at every size, the active one
 * is visible without hovering anything, and the primary action sits at the top
 * of the rail instead of competing with the identity for the same corner. It
 * also gives the recent topics somewhere to live, which is the thing people
 * actually navigate to — the tabs are three places, the topics are the work.
 *
 * Below `lg` the rail becomes a drawer behind a labelled button, because 256px
 * of permanent chrome on a 375px screen is two thirds of the page. Same
 * component, same order, same labels: the small screen gets the identical
 * navigation, not a reduced one.
 */

const ITEMS = [
  { href: "/home", label: "Home", icon: House },
  { href: "/record", label: "Record", icon: Mic },
  { href: "/settings", label: "Settings", icon: Settings },
];

type NavItem = (typeof ITEMS)[number];

/** What the rail needs of a course: where it goes, and what to call it. */
export type SidebarTopic = Pick<Course, "id" | "slug" | "topic" | "name">;

/* The same curve as `--ease-enter`. Not a spring: an indicator that overshoots
   its own tab draws attention to the animation rather than to where you are. */
const EASE = [0.23, 1, 0.32, 1] as const;

function isActive(pathname: string, href: string) {
  // "/home" is a prefix of every course URL, so it needs an exact match or it
  // stays lit on every page in the app.
  return href === "/home" ? pathname === "/home" : pathname.startsWith(href);
}

function initials(first: string, last: string) {
  return `${first.at(0) ?? ""}${last.at(0) ?? ""}`.toUpperCase() || "?";
}

/** The mono section headings inside the rail. */
function RailLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-2 font-mono text-[0.6rem] text-subtle uppercase tracking-[0.14em]">
      {children}
    </p>
  );
}

function Rail({
  firstName,
  lastName,
  showAdmin,
  topics,
  onNavigate,
}: {
  firstName: string;
  lastName: string;
  showAdmin: boolean;
  topics: SidebarTopic[];
  /** Closes the drawer. Undefined in the permanent rail, which never closes. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  /* Per instance, so the drawer's indicator and the permanent rail's are two
     separate shared-layout groups rather than one animating between them. */
  const layoutId = useId();
  const items: NavItem[] = showAdmin
    ? [...ITEMS, { href: "/admin", label: "Admin", icon: ShieldCheck }]
    : ITEMS;

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      {/* Same mark and same wordmark as the landing masthead. The register
          changes across the sign-in on purpose; the identity does not. */}
      <Link
        href="/home"
        onClick={onNavigate}
        className="press flex items-center gap-2.5 px-3 text-strong"
      >
        <ExplainaloudMark className="size-7 shrink-0 text-[color:var(--accent-solid)]" />
        <span className="font-semibold text-[0.92rem] uppercase tracking-[0.04em]">
          Explainaloud
        </span>
      </Link>

      {/* The one primary action in the frame, full width at the top of the
          rail. In the old bar it sat beside the sign-out button, which is the
          least and most destructive controls in the product an inch apart. */}
      <Button asChild className="w-full justify-center gap-2 font-semibold">
        <Link href="/new" onClick={onNavigate}>
          <Plus className="size-4" />
          New topic
        </Link>
      </Button>

      <nav aria-label="Main">
        <RailLabel>Menu</RailLabel>
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "press relative flex items-center gap-3 rounded-control px-3 py-2.5 font-medium text-sm transition-colors duration-200",
                    /* The active item is the one place in the frame the accent
                       appears. Everything else is ink or grey, so "where am I"
                       is answered by the only colour on screen. */
                    active
                      ? "text-[color:var(--accent-solid)]"
                      : "text-subtle hover:bg-muted hover:text-strong",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={layoutId}
                      transition={{ duration: 0.28, ease: EASE }}
                      className="absolute inset-0 rounded-control bg-accent-wash"
                    />
                  )}
                  <Icon aria-hidden className="relative size-[1.05rem]" />
                  <span className="relative">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {topics.length > 0 && (
        <nav aria-label="Recent topics">
          <RailLabel>Recent topics</RailLabel>
          <ul className="flex flex-col gap-0.5">
            {topics.map((topic) => {
              const href = courseHref(topic);
              const active = pathname.startsWith(href);
              return (
                <li key={topic.id}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "press flex items-center gap-2.5 rounded-control px-3 py-2 text-sm transition-colors duration-200",
                      active
                        ? "bg-accent-wash font-medium text-strong"
                        : "text-subtle hover:bg-muted hover:text-strong",
                    )}
                  >
                    {/* A dot rather than a document glyph: four identical icons
                        down the rail is furniture, and the words are the thing
                        being scanned. */}
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 shrink-0 rounded-full transition-colors duration-200",
                        active ? "bg-[color:var(--accent-solid)]" : "bg-border",
                      )}
                    />
                    {/* The name it was given, falling back to what it was
                        built from — the same title the topic cards carry. */}
                    <span className="truncate">
                      {topic.name ?? topic.topic}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="mt-auto flex flex-col gap-3 border-border border-t pt-4">
        <div className="flex min-w-0 items-center gap-2.5 px-1">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-wash font-medium text-[0.72rem] text-brand-ink"
          >
            {initials(firstName, lastName)}
          </span>
          <span className="min-w-0 truncate text-sm text-strong">
            {firstName} {lastName}
          </span>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}

export function AppShell({
  firstName,
  lastName,
  showAdmin,
  topics,
  children,
}: {
  firstName: string;
  lastName: string;
  showAdmin: boolean;
  topics: SidebarTopic[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  /* Arriving somewhere is the end of navigating: a drawer still standing open
     over the page you asked for is a second click to see what you clicked.
     Every link in the drawer also closes it on click, but that misses the back
     button, which is the one navigation the drawer does not start. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: the path is the trigger, not an input
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const rail = { firstName, lastName, showAdmin, topics };

  return (
    /* `register-app` is the switch. Everything below this div reads the app's
       canvas, ink, accent, radii and elevation; everything outside it — the
       landing page, the auth screens — keeps the other register. See the block
       of the same name in `globals.css` for why it is a class on the shell
       rather than a second `:root`. */
    <div className="register-app flex min-h-screen bg-background">
      {/* Sticky and its own scroll container, so a long gap report scrolls
          under a rail that stays put. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-border border-r bg-card lg:block">
        <Rail {...rail} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* The small-screen bar. Opaque, and no blur: a bar pinned to the top
            of a scrolling page re-snapshots and re-blurs the strip behind it on
            every frame of every scroll, and what that buys is a translucency
            nobody could describe. */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-border border-b bg-background px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="press flex size-9 items-center justify-center rounded-control border border-border bg-card text-strong shadow-rest"
          >
            <Menu className="size-4" />
          </button>
          <Link
            href="/home"
            className="press flex min-w-0 items-center gap-2.5 text-strong"
          >
            <ExplainaloudMark className="size-6 shrink-0 text-[color:var(--accent-solid)]" />
            <span className="truncate font-semibold text-[0.88rem] uppercase tracking-[0.04em]">
              Explainaloud
            </span>
          </Link>
          <Button asChild size="sm" className="ml-auto gap-1.5 font-semibold">
            <Link href="/new" aria-label="New topic">
              <Plus className="size-4" />
              <span className="hidden sm:inline">New topic</span>
            </Link>
          </Button>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-[rgba(9,9,11,0.45)]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.28, ease: EASE }}
              className="absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] border-border border-r bg-card"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="press absolute top-5 right-3 flex size-8 items-center justify-center rounded-control text-subtle transition-colors hover:bg-muted hover:text-strong"
              >
                <X className="size-4" />
              </button>
              <Rail {...rail} onNavigate={() => setOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
