"use client";

import { motion } from "framer-motion";
import {
  ChevronDown,
  ClipboardList,
  GraduationCap,
  House,
  Mic,
  Settings,
  ShieldCheck,
} from "lucide-react";
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

const ITEMS = [
  { href: "/home", label: "Home", icon: House },
  { href: "/record", label: "Record", icon: Mic },
  { href: "/gapreport", label: "Gap Report", icon: ClipboardList },
  { href: "/reteach", label: "Re-Teach", icon: GraduationCap },
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
            current ? `Menu — currently on ${current.label}` : "Open menu"
          }
          className="flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1.5 text-sm font-medium text-strong transition-colors hover:bg-surface/80 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none md:hidden"
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
                "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors duration-200 lg:px-3",
                active ? "text-strong" : "text-subtle hover:text-strong",
              )}
            >
              {/* Shared layout id: the active pill slides between tabs instead
                  of disappearing and reappearing. */}
              {active && (
                <motion.span
                  layoutId={layoutId}
                  transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                  className="absolute inset-0 rounded-md bg-surface"
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
