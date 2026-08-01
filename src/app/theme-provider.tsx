"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    /* Light by default, not the system setting.
     *
     * Following the OS was the earlier behaviour and it meant most people met
     * this product in the dark theme without ever choosing it. The design is
     * drawn on light: a printed script, hard hairlines, ultramarine on grey
     * stock. Dark is a real option that still works, but it is now something
     * someone opts into, not what a machine setting decides for them.
     *
     * `enableSystem` stays on so "System" remains a choice in the switcher. */
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
