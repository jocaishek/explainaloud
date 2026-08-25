"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { cn } from "~/lib/utils";
import { markTourSeen } from "./tour-actions";

/**
 * The first-run tour: three steps, then it never appears again.
 *
 * **Why three.** The app has exactly one loop — put material in, explain it
 * out loud, read back what you missed — and somebody who knows those three
 * things knows the product. A tour that walks every control teaches the menu
 * rather than the idea, and its real effect is that people dismiss it on step
 * two and never see the part that mattered.
 *
 * **Why a ring rather than a dimmed overlay.** The usual pattern darkens the
 * page and cuts a hole over the target, which means the thing being explained
 * is the only thing you can see and the tour has to be finished before the app
 * can be used. This just outlines the target and puts a card near it: the page
 * stays live, clicking anywhere carries on, and somebody who would rather just
 * start can. A tutorial that traps you is worse than no tutorial.
 *
 * **Why the account and not just localStorage.** This used to be a
 * `localStorage` key alone, on the argument that a second showing is a mild
 * annoyance and not worth a column. That argument is sound on a desktop
 * browser and wrong on a phone, which is where it was reported: the tour came
 * back on every sign-in.
 *
 * The cause is that a phone often signs in from an emailed link, which opens
 * in the mail app's in-app webview — a storage partition of its own, usually
 * discarded when the sheet closes. So the tour was not repeating; it was being
 * shown for the first time, again, to a browser that had never seen it. Safari
 * evicting script-written storage after seven idle days does the same thing
 * more slowly. Neither is fixable on the client, because in both cases the
 * client genuinely has no memory.
 *
 * So the account remembers, and `localStorage` stays as a second, cheaper
 * guard: it costs nothing, it covers the browser that already dismissed the
 * tour before this shipped, and it means a failed write is not a repeat.
 */

const SEEN_KEY = "explainaloud:tour:v1";

type Step = {
  /** `data-tour` value of the element this step points at. */
  target: string;
  kicker: string;
  title: string;
  body: string;
};

/* The three steps ring three real parts of the frame.
 *
 * Steps 1 and 2 used to point at the same thing: a "Start here" panel on the
 * dashboard that listed the loop as three numbered rows. That panel is gone —
 * the topics somebody came for now lead the page — so the tour points at the
 * controls that actually do the work instead of at a description of them,
 * which is what a tour is for. A ring around the real Record button teaches
 * where Record is; a ring around a row that says "Explain it out loud" only
 * teaches that the row exists. */
const STEPS: Step[] = [
  {
    target: "topics",
    kicker: "Step 1 of 3",
    title: "Start with your material",
    body: "Upload slides, a chapter or your notes. A short course gets built from them, and every claim in it is tied to a quote from your files.",
  },
  {
    target: "record",
    kicker: "Step 2 of 3",
    title: "Then explain it out loud",
    body: "Three minutes, the way you would to someone who has never met it. You are marked while you are still talking.",
  },
  {
    target: "topics",
    kicker: "Step 3 of 3",
    title: "Read back what you missed",
    body: "Claim by claim: what you got right, what was too vague to check, and what you never reached. Your topics live here.",
  },
];

export function FirstRunTour({ seen }: { seen: boolean }) {
  /* `null` until the effect has read localStorage. Rendering the card on the
     first paint and then hiding it would flash the tour at everybody who has
     already dismissed it — localStorage is not readable during SSR, so the
     server and the first client render have to agree on "nothing". */
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (seen) return;
    let dismissedHere = false;
    try {
      dismissedHere = localStorage.getItem(SEEN_KEY) !== null;
    } catch {
      // Private mode, or storage disabled. The account is the real record, so
      // fall through and let it decide.
    }
    if (dismissedHere) return;

    setStep(0);
    /* Marked on show, not on dismissal. The failure being fixed is the tour
       coming back, and the most ordinary thing anybody does on a phone is
       read the first card, tap the thing it points at, and never press Done —
       which under a mark-on-dismiss rule is a tour that repeats forever. */
    void markTourSeen();
  }, [seen]);

  const current = step === null ? null : STEPS[step];

  /* Measure after layout, before paint, so the ring is never drawn one frame
     behind the element it is meant to be around. Re-measured on resize and on
     scroll because the ring is positioned in viewport coordinates. */
  useLayoutEffect(() => {
    if (!current) return;

    const measure = () => {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      const box = el?.getBoundingClientRect() ?? null;
      setRect(box && box.height > 0 ? box : null);
    };
    measure();

    /* Coalesced to one measurement per frame.
     *
     * `measure` was wired straight to the scroll event, and it calls
     * `setRect` — so a scroll fired a React state update, and therefore a
     * re-render of this component, once per scroll event rather than once
     * per frame. Browsers can emit several of those between paints, and
     * `getBoundingClientRect` forces layout each time. The tour only runs on
     * somebody's first visit, which is the worst possible moment for the app
     * to feel heavy. */
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    /* Only when the target is actually laid out. Below `lg` the rail is a
       drawer, so `[data-tour="record"]` may be present but zero-sized —
       scrolling to it would jump the page for no visible reason, and the ring
       is skipped for the same measurement. The card still says its piece. */
    if (el && el.getBoundingClientRect().height > 0) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [current]);

  /* Stable, so the Escape listener below binds once for the whole tour rather
     than being torn down and re-added on every render. */
  const close = useCallback(() => {
    setStep(null);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Nothing to do — the tour simply runs again next time.
    }
  }, []);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, close]);

  if (step === null || !current) return null;

  const last = step === STEPS.length - 1;

  return (
    <>
      {/* The ring. Drawn in viewport coordinates over the real element, with
          no pointer events of its own so the page underneath stays usable. */}
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 rounded-card ring-2 ring-[color:var(--accent-solid)] ring-offset-4 ring-offset-[color:var(--background)] transition-all duration-300 ease-out"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      )}

      {/* The card. Fixed to the bottom of the window rather than floated
          beside the target: a card that chases the element has to solve
          flipping, clamping and overflow on every screen size, and the thing
          it is pointing at is already ringed. */}
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        className={cn(
          "-translate-x-1/2 glass-panel fixed bottom-6 left-1/2 z-50 w-[min(26rem,calc(100vw-2rem))]",
          "rounded-card p-5 text-left",
        )}
      >
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-mono text-[0.62rem] text-subtle uppercase tracking-[0.09em]">
            {current.kicker}
          </span>
          <button
            type="button"
            onClick={close}
            className="press font-mono text-[0.62rem] text-subtle uppercase tracking-[0.09em] transition-colors hover:text-strong"
          >
            Skip
          </button>
        </div>

        <h2
          id="tour-title"
          className="mt-2 font-semibold text-[1.05rem] text-strong leading-tight"
        >
          {current.title}
        </h2>
        <p className="mt-2 text-[0.88rem] text-subtle leading-relaxed">
          {current.body}
        </p>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => (last ? close() : setStep(step + 1))}
            className="press h-9 rounded-control bg-accent-solid px-4 font-semibold text-[0.85rem] text-accent-contrast transition-colors duration-200 hover:bg-accent-solid-hover"
          >
            {last ? "Got it" : "Next"}
          </button>
          {/* Which step you are on, as three marks rather than a sentence. */}
          <span
            className="ml-auto flex items-center gap-1.5"
            aria-hidden="true"
          >
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                className={cn(
                  "h-[5px] w-[5px] rounded-full transition-colors duration-200",
                  i === step ? "bg-[color:var(--accent-solid)]" : "bg-border",
                )}
              />
            ))}
          </span>
        </div>
      </div>
    </>
  );
}
