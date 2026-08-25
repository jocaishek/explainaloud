"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { transitions } from "~/components/landing/motion-presets";

/**
 * The sign-up helper.
 *
 * A floating bubble lived here before and was removed, because it opened a
 * card asking "What do you need to say clearly today?" — a question with no
 * answer, attached to nothing, on every screen of the page. This is the same
 * furniture used for the opposite purpose.
 *
 * What makes it work rather than nag:
 *
 * - **It waits.** Nothing appears until the reader has been past the demo, so
 *   it only ever speaks to somebody who has watched a take get marked. An
 *   offer made before the argument is an interruption.
 * - **It says one thing.** A single concrete next step, not a conversation.
 * - **It leaves.** Dismissing it is one click and it stays dismissed for the
 *   session, because a prompt that comes back is an advert.
 */
export function SignupNudge() {
  const [shown, setShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const firedRef = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (dismissed) return;
    const demo = document.querySelector("#live-demo");
    if (!demo) return;

    /* Fires when the demo has been scrolled *past*, not when it appears.
       `rootMargin` pulls the trigger line up to the top of the viewport, so
       the callback runs once the section has left rather than the moment it
       arrives — which is the difference between "you have seen this" and
       "this is on screen". */
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || firedRef.current) return;
        if (entry.boundingClientRect.top > 0) return;
        firedRef.current = true;
        setShown(true);
      },
      { rootMargin: "0px 0px -100% 0px" },
    );
    observer.observe(demo);
    return () => observer.disconnect();
  }, [dismissed]);

  return (
    <AnimatePresence>
      {shown && !dismissed && (
        <motion.aside
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={reduceMotion ? { duration: 0.2 } : transitions.spring}
          /* A card on a monitor, a bar on a phone.
           *
           * The width was a flat 12.5rem at every size. That is 14% of a
           * 1440 window and 51% of a 390 one, so the same "unobtrusive
           * corner card" was a slab parked over half the screen on a phone,
           * covering the copy it was trying to sell. Below `sm` it spans the
           * width instead and lays its three parts out in a row, which is
           * shallower — it costs a strip at the foot of the screen rather
           * than a quarter of the middle. */
          className="fixed inset-x-3 bottom-3 z-[80] flex items-center gap-3 border border-white/15 bg-[var(--panel-deep)] p-3 text-primary-foreground sm:inset-x-auto sm:right-4 sm:bottom-4 sm:block sm:w-[12.5rem]"
        >
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="absolute top-2.5 right-2.5 text-primary-foreground/50 transition-colors hover:text-primary-foreground"
          >
            <X className="h-3 w-3" />
          </button>

          <div className="min-w-0 flex-1 sm:flex-none">
            <p className="font-mono text-[0.55rem] text-[var(--ok-light)] uppercase tracking-[0.13em]">
              That was an example
            </p>
            <p className="mt-1 pr-3 font-display text-[0.88rem] leading-snug">
              Run it on your own material.
            </p>
          </div>

          <Link
            href="/signup"
            className="inline-flex h-7 shrink-0 items-center gap-1.5 bg-[var(--accent-solid)] px-2.5 font-medium text-[0.75rem] text-[var(--brand-foreground)] transition-transform duration-200 hover:scale-[1.03] sm:mt-2.5"
          >
            Start free <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
