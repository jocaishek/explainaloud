"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronsUpDown,
  House,
  LogOut,
  Menu,
  Mic,
  PanelLeft,
  Plus,
  Settings,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { ExplainaloudMark } from "~/components/explainaloud-mark";
import { StreakFlame } from "~/components/streak-flame";
import { StreakToast } from "~/components/streak-toast";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { Folder } from "~/lib/folders";
import { streakLabel } from "~/lib/streak";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";
import { type RailCourse, RailTopics } from "./rail-topics";

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
 * actually navigate to — the tabs are places, the topics are the work.
 *
 * **Two tiers, and the split is deliberate.** Home and Record are what you came
 * to do, and they sit at the top under the primary action. Settings and Admin
 * are what you set once and then leave alone, so they sit at the foot of the
 * rail with the account they belong to. A menu that lists the thing you do ten
 * times a day and the thing you did once in March as peers is a menu that has
 * not been ordered.
 *
 * **It retracts to icons.** A rail that cannot get out of the way is a rail
 * somebody resents on a laptop, and 256px is a fifth of a 1280px screen. The
 * choice is kept in a cookie rather than in state, so the server renders the
 * width the reader last chose and the page does not jump a frame after
 * hydration.
 *
 * Below `lg` the rail becomes a drawer behind a labelled button, because 256px
 * of permanent chrome on a 375px screen is two thirds of the page. Same
 * component, same order, same labels: the small screen gets the identical
 * navigation, not a reduced one.
 */

/** What you came to do. Top of the rail. */
const PRIMARY = [
  { href: "/home", label: "Home", icon: House },
  { href: "/record", label: "Record", icon: Mic },
  { href: "/friends", label: "Friends", icon: Users },
];

/* Settings and your profile are not in this list. They live in the account
   menu at the foot of the rail, with sign-out — see `AccountMenu`. */
const ADMIN = { href: "/admin", label: "Admin", icon: ShieldCheck };

type NavItem = (typeof PRIMARY)[number];

export type { RailCourse } from "./rail-topics";

/** The cookie the retracted state is remembered in. */
const RAIL_COOKIE = "rail-collapsed";

/* The product's one easing curve. Not a spring: an indicator that overshoots
   its own tab draws attention to the animation rather than to where you are. */
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Is `href` this page, or a page inside it?
 *
 * The boundary is not optional, and the bug it fixes was visible on screen: a
 * bare `startsWith` lights *every* topic whose slug is a prefix of another
 * one, so two courses called "How to read literature like a professor" — slugs
 * `…professor` and `…professor-2` — were both marked as the page you were on.
 * Comparing against `href + "/"` makes a longer slug a different topic rather
 * than a deeper page.
 */
function isUnder(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isActive(pathname: string, href: string) {
  // "/home" is a prefix of every course URL, so it is an exact match: the Home
  // tab must not stay lit while you are inside a topic.
  return href === "/home" ? pathname === href : isUnder(pathname, href);
}

function initials(first: string, last: string) {
  return `${first.at(0) ?? ""}${last.at(0) ?? ""}`.toUpperCase() || "?";
}

/** One destination. Icon only when the rail is retracted. */
function RailLink({
  item,
  active,
  collapsed,
  layoutId,
  badge = 0,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  layoutId: string;
  /** A count worth interrupting for. Zero draws nothing at all. */
  badge?: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      /* The first-run tour rings this one. It is on the link rather than on a
         wrapper so the ring follows the control, and it is only on Record
         because that is the one step of the loop the dashboard no longer
         spells out for itself. */
      data-tour={item.href === "/record" ? "record" : undefined}
      aria-current={active ? "page" : undefined}
      // The label is the accessible name when it is not on screen to be read.
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "press relative flex h-9 items-center gap-2.5 rounded-control text-sm transition-colors duration-150",
        collapsed ? "justify-center px-0" : "px-2",
        /* The active item is a raised step of surface with a hairline, in
           ink. Everything else is the muted grey, so "where am I" is answered
           without a colour of its own. */
        active ? "text-strong" : "text-subtle hover:bg-muted hover:text-strong",
      )}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          transition={{ duration: 0.28, ease: EASE }}
          className="absolute inset-0 rounded-control border border-border bg-card shadow-rest"
        />
      )}
      <span className="relative flex shrink-0 items-center">
        <Icon aria-hidden strokeWidth={1.5} className="size-4" />
        {/* Retracted, the count has nowhere to sit beside a label, so it
            becomes a dot on the glyph. Expanded it is the number, ranged
            right, because "three people are waiting" and "somebody is
            waiting" are different amounts of urgency. */}
        {badge > 0 && collapsed && (
          <span
            aria-hidden
            className="-right-1 -top-0.5 absolute size-2 rounded-full bg-[color:var(--accent-solid)] ring-2 ring-card"
          />
        )}
      </span>
      {!collapsed && (
        <>
          <span className="relative truncate">{item.label}</span>
          {badge > 0 && (
            <span
              aria-hidden
              className="relative ml-auto font-mono text-subtle text-xs tabular-nums"
            >
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </>
      )}
      {badge > 0 && (
        <span className="sr-only">
          {badge} {badge === 1 ? "request" : "requests"} waiting
        </span>
      )}
    </Link>
  );
}

/**
 * You, at the foot of the rail: your face and name, and the menu behind them.
 *
 * Profile, settings and sign-out used to be three separate controls here — a
 * link, a gear and a button — which put the least consequential and the most
 * consequential action in the product an inch apart. They are one menu now,
 * opened from the one thing in the rail that is about you.
 */
function AccountMenu({
  firstName,
  lastName,
  username,
  avatarUrl,
  collapsed,
  current,
  onNavigate,
}: {
  firstName: string;
  lastName: string;
  username: string | null;
  avatarUrl: string | null;
  collapsed: boolean;
  /** On the settings page, which is where your profile lives now. */
  current: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const name = `${firstName} ${lastName}`.trim();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={collapsed ? `${name}, account menu` : undefined}
          title={collapsed ? name : undefined}
          className={cn(
            "press flex min-w-0 items-center gap-2.5 rounded-control py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]",
            collapsed ? "justify-center px-0" : "px-2",
            current && "bg-muted",
          )}
        >
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-solid font-medium text-[0.72rem] text-accent-contrast"
          >
            {avatarUrl ? (
              // biome-ignore lint/performance/noImgElement: a 32px avatar; see profile/avatar-picker.tsx
              <img
                src={avatarUrl}
                alt=""
                width={32}
                height={32}
                className="size-full object-cover"
              />
            ) : (
              initials(firstName, lastName)
            )}
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-sm text-strong">
                  {name}
                </span>
                {username && (
                  <span className="block truncate text-subtle text-xs">
                    @{username}
                  </span>
                )}
              </span>
              <ChevronsUpDown
                aria-hidden
                strokeWidth={1.5}
                className="size-4 shrink-0 text-subtle"
              />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56"
      >
        <DropdownMenuItem asChild>
          <Link href="/settings#profile" onClick={onNavigate}>
            <User strokeWidth={1.5} />
            Your profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" onClick={onNavigate}>
            <Settings strokeWidth={1.5} />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={signingOut}
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
        >
          <LogOut strokeWidth={1.5} />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Rail({
  firstName,
  lastName,
  username,
  streak,
  avatarUrl,
  showAdmin,
  folders,
  courses,
  pendingRequests,
  collapsed,
  onToggle,
  onNavigate,
}: {
  firstName: string;
  lastName: string;
  username: string | null;
  /** Current streak in days, counted in the profile's zone. */
  streak: number;
  avatarUrl: string | null;
  showAdmin: boolean;
  folders: Folder[];
  courses: RailCourse[];
  /** People waiting on a friend request. Badges the Friends tab. */
  pendingRequests: number;
  collapsed: boolean;
  /** Retracts the rail. Absent inside the drawer, which closes instead. */
  onToggle?: () => void;
  /** Closes the drawer. Absent in the permanent rail, which never closes. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  /* Per instance, so the drawer's indicator and the permanent rail's are two
     separate shared-layout groups rather than one animating between them. */
  const layoutId = useId();
  const footer: NavItem[] = showAdmin ? [ADMIN] : [];

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-4 overflow-y-auto overflow-x-hidden py-4",
        collapsed ? "px-2" : "px-3",
      )}
    >
      {/* Identity, and the control that retracts the rail. Same mark and same
          wordmark as the landing masthead: the register changes across the
          sign-in on purpose, the identity does not. */}
      <div
        className={cn(
          "flex items-center gap-2",
          collapsed ? "flex-col" : "justify-between px-1",
        )}
      >
        <Link
          href="/home"
          onClick={onNavigate}
          aria-label="Explainaloud, home"
          className="press flex min-w-0 items-center gap-2.5 text-strong"
        >
          <ExplainaloudMark disc className="size-6 shrink-0 text-strong" />
          {!collapsed && (
            <span className="truncate font-medium text-base tracking-[-0.02em]">
              explainaloud
            </span>
          )}
        </Link>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand the menu" : "Retract the menu"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand the menu" : "Retract the menu"}
            className="press flex size-8 shrink-0 items-center justify-center rounded-control text-subtle transition-colors hover:bg-muted hover:text-strong"
          >
            <PanelLeft className="size-4" />
          </button>
        )}
      </div>

      {/* The one primary action in the frame. In the old bar it sat beside the
          sign-out button, which is the most and the least consequential
          controls in the product an inch apart. */}
      <Button
        asChild
        size={collapsed ? "icon" : "default"}
        className={cn("gap-2", collapsed ? "self-center" : "w-full")}
      >
        <Link href="/new" onClick={onNavigate} aria-label="New topic">
          <Plus className="size-4" />
          {!collapsed && "New topic"}
        </Link>
      </Button>

      <nav aria-label="Main">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY.map((item) => (
            <li key={item.href}>
              <RailLink
                item={item}
                active={isActive(pathname, item.href)}
                collapsed={collapsed}
                layoutId={layoutId}
                badge={item.href === "/friends" ? pendingRequests : 0}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* Retracted, this list would be a column of identical dots: the words
          are the content, so there is nothing left to show. */}
      {!collapsed && (folders.length > 0 || courses.length > 0) && (
        <RailTopics
          folders={folders}
          courses={courses}
          isCurrent={(href) => isUnder(pathname, href)}
          onNavigate={onNavigate}
        />
      )}

      <div className="mt-auto flex flex-col gap-1 border-border border-t pt-3">
        {footer.length > 0 && (
          <nav aria-label="Account">
            <ul className="flex flex-col gap-0.5">
              {footer.map((item) => (
                <li key={item.href}>
                  <RailLink
                    item={item}
                    active={isActive(pathname, item.href)}
                    collapsed={collapsed}
                    layoutId={layoutId}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* The streak, on every screen. Quiet when there is none: the flame
            is reserved for a run that exists. */}
        <div
          className={cn(
            "flex h-9 items-center gap-2.5 text-sm",
            collapsed ? "justify-center" : "px-2",
          )}
          title={collapsed ? streakLabel(streak) : undefined}
        >
          {streak > 0 ? (
            <StreakFlame size="sm" />
          ) : (
            <span aria-hidden className="size-4" />
          )}
          {!collapsed && (
            <span
              className={cn(
                "tabular-nums",
                streak > 0 ? "font-medium text-strong" : "text-subtle",
              )}
            >
              {streakLabel(streak)}
            </span>
          )}
          {collapsed && <span className="sr-only">{streakLabel(streak)}</span>}
        </div>

        <AccountMenu
          firstName={firstName}
          lastName={lastName}
          username={username}
          avatarUrl={avatarUrl}
          collapsed={collapsed}
          current={isActive(pathname, "/settings")}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

export function AppShell({
  firstName,
  lastName,
  username,
  streak,
  avatarUrl,
  showAdmin,
  folders,
  courses,
  pendingRequests,
  defaultCollapsed,
  children,
}: {
  firstName: string;
  lastName: string;
  username: string | null;
  streak: number;
  avatarUrl: string | null;
  showAdmin: boolean;
  folders: Folder[];
  courses: RailCourse[];
  /** People waiting on a friend request. Badges the Friends tab. */
  pendingRequests: number;
  /** Read from the cookie on the server, so the first paint is the right width. */
  defaultCollapsed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

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

  function toggleRail() {
    setCollapsed((was) => {
      const next = !was;
      /* A year, because this is a preference rather than a session.
       *
       * `document.cookie` rather than the Cookie Store API: this is one
       * synchronous write of one flag, and the modern API is a promise plus a
       * feature check for a value the server has to be able to read on the
       * very next navigation. */
      // biome-ignore lint/suspicious/noDocumentCookie: one synchronous flag; the async API buys nothing here
      document.cookie = `${RAIL_COOKIE}=${next ? "1" : "0"};path=/;max-age=31536000;samesite=lax`;
      return next;
    });
  }

  const rail = {
    firstName,
    lastName,
    username,
    streak,
    avatarUrl,
    showAdmin,
    folders,
    courses,
    pendingRequests,
  };

  return (
    /* `register-app` is the switch. Everything below this div reads the app's
       canvas, ink, accent, radii and elevation; everything outside it — the
       landing page, the auth screens — keeps the other register. See the block
       of the same name in `globals.css` for why it is a class on the shell
       rather than a second `:root`. */
    <div className="register-app flex min-h-screen bg-background">
      {/* Sticky and its own scroll container, so a long gap report scrolls
          under a rail that stays put. The width is transitioned rather than
          snapped: the page beside it reflows either way, and a third of a
          second of travel is what says the rail moved rather than that the
          screen changed. */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-border border-r bg-background lg:block",
          "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          collapsed ? "w-[4.25rem]" : "w-62",
        )}
      >
        <Rail {...rail} collapsed={collapsed} onToggle={toggleRail} />
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
            <ExplainaloudMark disc className="size-6 shrink-0 text-strong" />
            <span className="truncate font-medium text-base tracking-[-0.02em]">
              explainaloud
            </span>
          </Link>
          <Button asChild size="sm" className="ml-auto gap-1.5">
            <Link href="/new" aria-label="New topic">
              <Plus className="size-4" />
              <span className="hidden sm:inline">New topic</span>
            </Link>
          </Button>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      {/* Mounted once, at the top of the app, and driven by a window event —
          so the recording screen four routes down announces a streak without
          either file importing the other. See `markRecordingDay`. */}
      <StreakToast />

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
              className="absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] border-border border-r bg-background"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="press absolute top-5 right-3 flex size-8 items-center justify-center rounded-control text-subtle transition-colors hover:bg-muted hover:text-strong"
              >
                <X className="size-4" />
              </button>
              {/* Never retracted: a drawer you asked to see is not one to hide
                  behind icons. */}
              <Rail
                {...rail}
                collapsed={false}
                onNavigate={() => setOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
