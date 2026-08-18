"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { StreakFlame } from "~/components/streak-flame";
import {
  STREAK_EVENT,
  type StreakEvent,
  type StreakNotice,
  streakNotice,
} from "~/lib/streak";

/** How long it stays. A milestone earns the extra second and a half. */
const HOLD_MS = 4800;
const HOLD_MS_BIG = 6400;

const EASE = [0.23, 1, 0.32, 1] as const;

type Shown = StreakNotice & { streak: number; id: number };

/**
 * The bottom-left notice a finished recording produces.
 *
 * Mounted once in the shell and driven by a window event, so nothing in the
 * recording screen has to know this exists — see `markRecordingDay`.
 *
 * **It fires on the first recording of a day and on no other.** That rule
 * lives in `streakNotice`, and it is the difference between a moment and a
 * nag: four takes on a Sunday afternoon move the streak once.
 *
 * Bottom left, which is the corner nothing else in this app uses. Toasts go
 * top-right by convention and the convention is wrong here — the top right of
 * the screen is where somebody's own recording controls and their account sit,
 * and a card that lands over either is a card that gets dismissed before it is
 * read.
 */
export function StreakToast() {
  const [shown, setShown] = useState<Shown | null>(null);
  const reduced = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setShown(null);
  }, []);

  useEffect(() => {
    function onStreak(event: Event) {
      const detail = (event as CustomEvent<StreakEvent>).detail;
      if (!detail) return;
      const notice = streakNotice(detail);
      if (!notice) return;

      if (timer.current) clearTimeout(timer.current);
      /* A fresh id every time, so a second notice while one is still on screen
         re-runs the arrival rather than swapping the words underneath a card
         that has already finished animating. */
      setShown({ ...notice, streak: detail.streak, id: Date.now() });
      timer.current = setTimeout(
        () => setShown(null),
        notice.big ? HOLD_MS_BIG : HOLD_MS,
      );
    }

    window.addEventListener(STREAK_EVENT, onStreak);
    return () => {
      window.removeEventListener(STREAK_EVENT, onStreak);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    /* `pointer-events-none` on the frame and back on for the card: the corner
       of a page is somewhere people click, and a fixed wrapper spanning it
       would swallow those clicks for as long as the card is up — and for ever
       once it is not. */
    <div className="pointer-events-none fixed bottom-4 left-4 z-[60] flex max-w-[min(21rem,calc(100vw-2rem))] flex-col">
      {/* `wait`, so a second streak in one session replaces the first
          rather than stacking a second card on top of it. */}
      <AnimatePresence mode="wait">
        {shown && (
          <motion.div
            key={shown.id}
            role="status"
            aria-live="polite"
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduced ? 0.12 : 0.28, ease: EASE }}
            className="pointer-events-auto relative flex items-start gap-3 rounded-card border border-border bg-card p-4 pr-9 shadow-float"
          >
            <StreakFlame lit size={shown.big ? "lg" : "md"} />

            <div className="min-w-0">
              <p className="font-semibold text-[0.95rem] text-strong leading-tight tracking-[-0.01em]">
                {shown.title}
              </p>
              <p className="mt-1 text-[0.82rem] text-subtle leading-relaxed">
                {shown.body}
              </p>
              {/* One place to go, and only when there is something to see
                  there. On day one the friends screen is empty. */}
              {shown.streak >= 2 && (
                <Link
                  href="/friends"
                  onClick={dismiss}
                  className="press mt-2 inline-block font-medium text-[0.8rem] text-brand-ink underline-offset-4 hover:underline"
                >
                  Show your friends
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="press absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-control text-subtle transition-colors hover:bg-muted hover:text-strong"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
