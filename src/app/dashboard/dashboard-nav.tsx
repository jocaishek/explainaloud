"use client";

import { motion } from "framer-motion";
import { House, Mic, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { cn } from "~/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/dashboard/record", label: "Record", icon: Mic },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  const layoutId = useId();

  return (
    <nav className="flex items-center gap-1">
      {ITEMS.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200",
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
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
