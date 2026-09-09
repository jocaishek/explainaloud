"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Mic } from "lucide-react";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEMOS, type PointVerdict } from "~/components/landing/demo-data";
import { transitions } from "~/components/landing/motion-presets";
import { cn } from "~/lib/utils";

/**
 * The product, running, on a loop.
 *
 * Everything else on this page *describes* the loop. A reader who has not used
 * it still has to take our word for how the pieces connect, because a still
 * frame cannot show a sequence — and a sequence is the entire product: material
 * goes in, you talk, claims resolve against it while you are still talking.
 *
 * ## Why it has no controls
 *
 * There was a play button and a scrub rail here, and they were wrong for a
 * landing page. A control is a question, and the question it asks is "do you
 * want to see what this does?" — asked of somebody who does not yet know what
 * it does, and who therefore has no reason to say yes. The demo now simply
 * runs, the way a promo film runs, and the only thing left to decide is which
 * subject, which is a question worth asking because the answer says something
 * (it works on chemistry and on history too).
 *
 * ## The three beats
 *
 * A browser window fills in a form by itself, the take is spoken into it, and
 * the gaps come back. Those are the three beats of using the product and they
 * are in the order you meet them, so somebody who watches one full turn has
 * been through the loop without reading a word of the copy beside it.
 *
 * The cursor is synthetic and moves on the same clock as everything else, so
 * it cannot drift out of step with what it is supposed to be doing. It is
 * keyframed in percentages of the panel rather than measured off the DOM,
 * which means it is correct at every width without a layout read on any frame.
 *
 * ## Nothing here calls a model
 *
 * The takes are authored. `design.md` bans invented proof on the landing, and
 * a live endpoint on a marketing page is an unauthenticated bill waiting to
 * happen. The panel says "authored example" in its own corner rather than
 * letting anyone infer otherwise.
 *
 * There is deliberately no score out of a hundred. The product grades claim by
 * claim, so a number would be a shape of proof this product does not produce.
 * What the ledger shows is the count it actually has: reached, thin, missed.
 */

/** One full turn of the loop. */
const CYCLE_MS = 17000;

/* The three beats, as fractions of the cycle. Written as boundaries rather
   than durations so the arithmetic below reads as "where are we", and so
   moving one beat cannot silently steal time from another. */
/* The setup beat is a third of the loop. It was a quarter, which left the
   drag itself about a second — long enough for the file to have moved and too
   short to see it moving, which is the worst of both. */
const SETUP_END = 0.34;
const TAKE_END = 0.8;

/** Phase offsets for the level meter, so the bars do not move as one block.
 *  Fixed values rather than random: identical on the server and the client,
 *  and identical between renders, which a random set would not be. */
const LEVELS = [0.2, 1.9, 3.4, 0.8, 2.6, 4.1, 1.2, 3.0, 5.2, 2.1] as const;

/** Speaking pace, derived from the reveal rather than typed in. */
const WORDS = (text: string) => text.trim().split(/\s+/).length;

const VERDICT_LABEL: Record<PointVerdict, string> = {
  ok: "Reached",
  vague: "Too thin",
  miss: "Missed",
};

const VERDICT_COLOR: Record<PointVerdict, string> = {
  ok: "var(--ok)",
  vague: "var(--vague)",
  miss: "var(--miss)",
};

/** The lit tints, for labels on the deep panel. `--miss` is tuned to be read
 *  on stock; at 3:1 over navy it reads as a smudge. */
const VERDICT_TINT: Record<PointVerdict, string> = {
  ok: "var(--ok-light)",
  vague: "var(--vague-light)",
  miss: "var(--miss-light)",
};

/**
 * The pointer's itinerary through the setup beat.
 *
 * `at` is when the pointer should have *arrived*; `hold` is how long it stays
 * before leaving for the next one. Everything between two stops is travel.
 */
const CURSOR_STOPS = [
  { target: "upload", at: 0.3, hold: 0.14 },
  { target: "name", at: 0.58, hold: 0.24 },
  { target: "start", at: 0.93, hold: 0.07 },
] as const;

type Point = { x: number; y: number };

/** Ease in and out of every leg: a hand accelerates away from a control and
 *  slows into the next one. Linear travel reads as a sprite on a rail. */
const easeLeg = (k: number) =>
  k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;

function cursorAt(t: number, points: Record<string, Point>): Point | null {
  const stops = CURSOR_STOPS.filter((stop) => points[stop.target]);
  if (!stops.length) return null;

  const first = points[stops[0].target];
  /* Before the first stop the pointer flies in from off the bottom right,
     which is where a hand comes from rather than fading in on top of the
     control it is about to use. */
  if (t <= stops[0].at) {
    const k = easeLeg(Math.max(0, t) / stops[0].at);
    return { x: 104 + (first.x - 104) * k, y: 112 + (first.y - 112) * k };
  }

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const here = points[stop.target];
    const leaves = stop.at + stop.hold;
    if (t <= leaves) return here;

    const next = stops[i + 1];
    if (!next) return here;
    if (t < next.at) {
      const k = easeLeg((t - leaves) / Math.max(0.001, next.at - leaves));
      const there = points[next.target];
      return {
        x: here.x + (there.x - here.x) * k,
        y: here.y + (there.y - here.y) * k,
      };
    }
  }
  return points[stops[stops.length - 1].target];
}

function Slug({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[0.6rem] uppercase leading-[1.5] tracking-[0.13em]",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}

export function DemoConsole() {
  const reduceMotion = useReducedMotion();
  const [demoId, setDemoId] = useState(DEMOS[0].id);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const demo = DEMOS.find((entry) => entry.id === demoId) ?? DEMOS[0];

  /* The take, measured once per subject. Characters rather than words, because
     a word-at-a-time reveal on display type reads as a slideshow — and because
     the underline has to be able to wipe *across* a phrase, which needs a
     position inside it. */
  const { chars, total, words } = useMemo(() => {
    let charTotal = 0;
    const parts = demo.take.map(([text, verdict]) => {
      const start = charTotal;
      charTotal += text.length;
      return { text, verdict, start, end: charTotal };
    });
    return {
      chars: parts,
      total: charTotal,
      words: demo.take.reduce((sum, [text]) => sum + WORDS(text), 0),
    };
  }, [demo]);

  /* Every beat is derived from the one clock, so nothing on screen can drift
     out of step with anything else. */
  const inSetup = progress < SETUP_END;
  const setupT = Math.min(1, progress / SETUP_END);
  const takeT = Math.min(
    1,
    Math.max(0, (progress - SETUP_END) / (TAKE_END - SETUP_END)),
  );
  const settled = progress >= TAKE_END;
  const revealed = Math.round(takeT * total);

  /* The file lands when the pointer reaches the upload box, and the name
     types while the pointer sits in the field. Both are read off the same
     clock as the pointer itself, so the text can never appear somewhere the
     hand is not. */
  /* The drop happens a beat after the pointer arrives, so there is a moment
     of holding the file over the zone rather than it teleporting in. */
  const DROP_AT = 0.4;
  const dropped = setupT > DROP_AT;
  /* The zone lights while the file is over it and before it is released,
     which is most of what makes a drag read as a drag rather than as a
     filename appearing. */
  const dragOver = !dropped && setupT > 0.24;
  const nameProgress = Math.min(1, Math.max(0, (setupT - 0.6) / 0.22));
  const nameTyped = demo.topic.slice(
    0,
    Math.round(nameProgress * demo.topic.length),
  );
  const pressing = setupT > 0.9;

  /**
   * Where each control actually is.
   *
   * The first version hand-placed the pointer in percentages of the panel and
   * looked exactly like what it was: a cursor drifting to coordinates that had
   * nothing to do with the controls, clicking on empty space beside the
   * button. So the positions are read from the DOM.
   *
   * But *not* every frame, which is the trade that made percentages tempting.
   * A rect read after a style change forces a layout flush, and doing that
   * sixty times a second to move one sprite is indefensible. Measured on mount,
   * on resize, and when the subject changes — the last of those matters
   * precisely because the panel's height is pinned, so a different filename
   * moves the controls without the `ResizeObserver` ever firing.
   *
   * The measurement is stored *with* the subject it was taken for, which is
   * what makes the dependency a real one rather than a re-run trigger the
   * linter has to be argued with. It also closes a genuine gap: between a
   * subject changing and the effect re-running there is a render where the
   * old positions are still in state, and without the id to compare against,
   * the pointer would spend that frame aiming confidently at where the last
   * subject's controls used to be.
   */
  const [measured, setMeasured] = useState<{
    id: string;
    points: Record<string, Point>;
  }>({ id: "", points: {} });

  useEffect(() => {
    const subject = demo.id;
    const panel = panelRef.current;
    if (!panel) return;

    const measure = () => {
      const box = panel.getBoundingClientRect();
      if (!box.width) return;
      const next: Record<string, Point> = {};
      for (const node of panel.querySelectorAll<HTMLElement>(
        "[data-cursor-target]",
      )) {
        const key = node.dataset.cursorTarget;
        if (!key) continue;
        const rect = node.getBoundingClientRect();
        next[key] = {
          x: ((rect.left + rect.width / 2 - box.left) / box.width) * 100,
          y: ((rect.top + rect.height / 2 - box.top) / box.height) * 100,
        };
      }
      setMeasured({ id: subject, points: next });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [demo.id]);

  /* Only trust positions taken for the subject on screen right now. */
  const cursorPoints = measured.id === demo.id ? measured.points : {};
  const cursor = cursorAt(setupT, cursorPoints);

  /* One frame loop, and it never stops until the panel leaves the screen.
     `progress` wraps rather than clamping, which is what makes this a loop
     instead of something that finishes and waits to be asked again. */
  useEffect(() => {
    if (!running || reduceMotion) return;
    /* Every commit here is a React render of the whole panel. At 60 a second
       on a phone that render was a real slice of the scroll jank, so touch
       devices commit at ~30fps instead — the cycle is minutes long, and half
       the frames of a slow cursor are indistinguishable. Time still advances
       by real elapsed delta, so nothing slows down, only the commit rate. */
    const minCommitMs = window.matchMedia("(pointer: coarse)").matches ? 33 : 0;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      if (delta >= minCommitMs) {
        last = now;
        setProgress((current) => (current + delta / CYCLE_MS) % 1);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, reduceMotion]);

  /* It runs while it is on screen and stops when it is not. A loop nobody can
     see is a loop nobody should be paying for, and this one is a page-long
     scroll away from the fold for most of a visit.

     Reduced motion gets the finished frame: the marked take and the full
     ledger, which is the information the animation exists to deliver. */
  useEffect(() => {
    if (reduceMotion) {
      setProgress(TAKE_END + 0.1);
      return;
    }
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setRunning(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [reduceMotion]);

  function pick(id: string) {
    setDemoId(id);
    setProgress(0);
  }

  const elapsed = takeT * (((TAKE_END - SETUP_END) * CYCLE_MS) / 1000);
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(
    Math.floor(elapsed % 60),
  ).padStart(2, "0")}`;
  const wpm = Math.round(
    words / (((TAKE_END - SETUP_END) * CYCLE_MS) / 1000 / 60),
  );

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-[76rem]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Slug className="mr-1 hidden text-muted-foreground sm:inline">
            Pick a subject
          </Slug>
          {DEMOS.map((entry) => {
            const active = entry.id === demo.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => pick(entry.id)}
                aria-pressed={active}
                className={cn(
                  "relative border px-3 py-1.5 font-medium text-[0.82rem] transition-colors duration-200 sm:px-4 sm:py-2 sm:text-[0.88rem]",
                  active
                    ? "border-[var(--primary)]"
                    : "border-border text-muted-foreground hover:border-[var(--primary)] hover:text-strong",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="demo-subject"
                    aria-hidden="true"
                    className="absolute inset-0 bg-[var(--primary)]"
                    transition={
                      reduceMotion ? { duration: 0 } : transitions.springStiff
                    }
                  />
                )}
                <span
                  className={cn(
                    "relative",
                    active && "text-[var(--primary-foreground)]",
                  )}
                >
                  {entry.subject}
                </span>
              </button>
            );
          })}
        </div>
        <Slug className="hidden text-muted-foreground sm:block">
          Authored example · not a live model
        </Slug>
      </div>

      <div className="mt-5 overflow-hidden rounded-[20px] border border-white/12 bg-[var(--panel-deep)] text-primary-foreground">
        {/* The window.
            A browser frame is a small lie that buys a large amount of clarity:
            it says "this is the product, in a browser, being used" before a
            single word is read, which is a claim the panel would otherwise
            have to make in copy. Three dots and a location are enough — a full
            toolbar is set dressing that competes with the thing inside it. */}
        <div className="flex items-center gap-3 border-white/10 border-b bg-[rgba(0,0,0,0.22)] px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          </span>
          <Slug className="truncate opacity-50">explainaloud.com/rehearse</Slug>
        </div>

        {/* The height is pinned on the container, not on either column.
            Each beat makes a different column the taller one — the setup form
            during the first, the resolving ledger during the rest — so the
            panel oscillated by 21px once per cycle, which is a page that
            twitches every seventeen seconds. Reserving on the grid means
            neither column can decide the height. */}
        <div
          ref={panelRef}
          className="relative grid lg:min-h-[27rem] lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]"
        >
          {/* The pointer, during the setup beat only. Once the take starts
              there is nothing for a hand to be doing, and a cursor parked on
              screen while text types itself is a prop nobody put away. */}
          {inSetup && !reduceMotion && cursor && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute z-20"
              style={{
                left: `${cursor.x}%`,
                top: `${cursor.y}%`,
                transform: "translate(-3px, -2px)",
              }}
            >
              {/* The file, in hand.
                  A filename that simply appears in a box is an upload having
                  already happened. Carrying it in and releasing it is the
                  action itself, and dragging a file onto a target is the one
                  gesture everybody already reads as "put this here". The card
                  rides the pointer, tilted slightly the way a held thing is,
                  and stops existing the moment it lands. */}
              {!dropped && (
                <span
                  className="-translate-y-1/2 absolute top-1 left-4 flex items-center gap-2 whitespace-nowrap border border-white/25 bg-[var(--panel-deep)] px-2.5 py-1.5"
                  style={{
                    transform: `rotate(-4deg) scale(${dragOver ? 1.04 : 1})`,
                    transition: "transform 220ms ease-out",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 bg-[var(--ok-light)]"
                  />
                  <span className="font-mono text-[0.68rem]">{demo.file}</span>
                </span>
              )}
              <svg width="20" height="22" viewBox="0 0 20 22" fill="none">
                <title>Pointer</title>
                <path
                  d="M1 1L1 17.5L5.4 13.6L8.2 20L11.4 18.6L8.6 12.4L14.2 12.2L1 1Z"
                  fill="#ffffff"
                  stroke="rgba(6,18,38,0.65)"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}

          <div className="relative flex flex-col p-4 sm:p-5 lg:min-h-[24rem] lg:p-10">
            {/* Both scenes live in one grid cell, so the panel is its final
                height on the first frame. The alternative is a box that grows
                as the take types in, which resizes the page under the reader
                for the whole of every cycle. */}
            <div className="grid flex-1">
              {/* ── Beat one: the form fills itself in. */}
              <motion.div
                aria-hidden={!inSetup}
                initial={false}
                animate={{ opacity: inSetup ? 1 : 0 }}
                transition={{ duration: 0.28 }}
                className="col-start-1 row-start-1 flex flex-col justify-center"
              >
                <Slug className="opacity-55">Subject</Slug>
                <div className="mt-2 flex">
                  <span className="border border-[var(--ok-light)]/40 px-3 py-1.5 font-mono text-[0.68rem] text-[var(--ok-light)] uppercase tracking-[0.12em]">
                    {demo.subject}
                  </span>
                </div>

                {/* The upload. A dropzone that receives a file rather than a
                    text field containing a filename: uploading is the first
                    thing anybody does with this product, and a box you drop
                    something into is what that looks like. The file lands as
                    the pointer arrives over it. */}
                <Slug className="mt-5 block opacity-55">Your material</Slug>
                <div
                  data-cursor-target="upload"
                  className="mt-2 flex h-[4.5rem] items-center justify-center border border-white/20 border-dashed px-4 transition-colors duration-300"
                  style={{
                    borderColor:
                      dropped || dragOver
                        ? "rgba(191,228,207,0.55)"
                        : undefined,
                    backgroundColor: dragOver
                      ? "rgba(191,228,207,0.12)"
                      : dropped
                        ? "rgba(191,228,207,0.06)"
                        : undefined,
                  }}
                >
                  {dropped ? (
                    <span className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 bg-[var(--ok)]"
                      />
                      <span className="font-mono text-[0.8rem]">
                        {demo.file}
                      </span>
                      <Slug className="opacity-50">uploaded</Slug>
                    </span>
                  ) : (
                    <Slug
                      className="transition-opacity duration-200"
                      style={{
                        opacity: dragOver ? 1 : 0.45,
                        color: dragOver ? "var(--ok-light)" : undefined,
                      }}
                    >
                      {dragOver
                        ? "Release to upload"
                        : "Drag a PDF or your notes here"}
                    </Slug>
                  )}
                </div>

                {/* The name. Typed, because typing is the one thing on this
                    panel that unambiguously reads as a person doing it. */}
                <Slug className="mt-5 block opacity-55">
                  Name this rehearsal
                </Slug>
                <div
                  data-cursor-target="name"
                  className="mt-2 flex h-11 items-center border border-white/20 px-3.5 text-[0.95rem]"
                >
                  {nameTyped || (
                    <span className="opacity-35">e.g. {demo.topic}</span>
                  )}
                  {nameProgress > 0 && nameProgress < 1 && (
                    <span
                      aria-hidden="true"
                      className="ml-0.5 inline-block h-[1.05em] w-[2px] bg-[var(--primary-foreground)]"
                    />
                  )}
                </div>

                <div className="mt-6 flex">
                  <span
                    data-cursor-target="start"
                    className="bg-[var(--accent-solid)] px-5 py-2.5 font-medium text-[0.88rem] text-[var(--brand-foreground)] transition-transform duration-150"
                    style={{ transform: pressing ? "scale(0.96)" : "none" }}
                  >
                    Start rehearsing
                  </span>
                </div>
              </motion.div>

              {/* ── Beats two and three: the take, marked as it lands. */}
              <motion.div
                aria-hidden={inSetup}
                initial={false}
                animate={{ opacity: inSetup ? 0 : 1 }}
                transition={{ duration: 0.28, delay: inSetup ? 0 : 0.14 }}
                className="col-start-1 row-start-1 flex flex-col"
              >
                {/* The recorder, made the size of the claim it is making.
                    This was a 2.5px dot and a timecode, which is the smallest
                    possible way to say "the product is listening to you right
                    now" — the single thing this whole section exists to show.
                    A mic under a live ring, a moving level meter and a
                    timecode that is actually legible say it at the size it
                    deserves. */}
                <div className="flex items-center gap-3.5 border-white/10 border-b pb-4">
                  <span
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors duration-500"
                    style={{
                      backgroundColor: settled
                        ? "rgba(238,242,248,0.14)"
                        : "var(--miss)",
                    }}
                  >
                    {!settled && !reduceMotion && (
                      <span className="absolute inset-0 animate-ping rounded-full border border-[var(--miss)] opacity-60" />
                    )}
                    <Mic className="relative h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <Slug
                      className="block"
                      style={{
                        color: settled ? undefined : "var(--miss-light)",
                      }}
                    >
                      {settled ? "Marked against your points" : "Recording"}
                    </Slug>
                    <span className="mt-1 block font-mono text-[1.05rem] tabular-nums leading-none">
                      {clock}
                    </span>
                  </div>

                  {/* The level meter. Driven off the same clock, so it cannot
                      still be bouncing after the take has stopped. */}
                  <span
                    className="hidden h-8 items-end gap-[3px] sm:flex"
                    aria-hidden="true"
                  >
                    {LEVELS.map((seed, index) => {
                      const wobble = settled
                        ? 0.14
                        : 0.35 +
                          0.65 *
                            Math.abs(Math.sin(takeT * 22 + index * 0.9 + seed));
                      return (
                        <span
                          key={`level-${seed}`}
                          className="w-[3px] origin-bottom rounded-full bg-[var(--ok-light)]"
                          style={{
                            height: "100%",
                            transform: `scaleY(${wobble.toFixed(3)})`,
                            opacity: settled ? 0.3 : 0.9,
                          }}
                        />
                      );
                    })}
                  </span>

                  <Slug className="shrink-0 tabular-nums opacity-60">
                    {wpm} wpm
                  </Slug>
                </div>

                <p className="mt-5 font-display text-[1.15rem] leading-[1.45] tracking-[-0.01em] sm:text-[1.45rem] sm:leading-[1.38] lg:text-[clamp(1.5rem,2.1vw,2.1rem)] lg:leading-[1.32] lg:tracking-[-0.02em]">
                  {chars.map(({ text, verdict, start, end }) => {
                    const cut = Math.min(
                      text.length,
                      Math.max(0, revealed - start),
                    );
                    const complete = revealed >= end;
                    if (verdict === "plain") {
                      return (
                        <span key={`${start}-plain`}>
                          <span>{text.slice(0, cut)}</span>
                          <span aria-hidden="true" className="opacity-0">
                            {text.slice(cut)}
                          </span>
                        </span>
                      );
                    }
                    return (
                      <span key={`${start}-${verdict}`}>
                        <span
                          className="transition-[color,background-size] duration-500 ease-out"
                          style={{
                            backgroundImage: `linear-gradient(var(--${verdict}), var(--${verdict}))`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "0 100%",
                            backgroundSize: complete ? "100% 2px" : "0% 2px",
                            color: complete
                              ? `var(--${verdict}-light)`
                              : "var(--primary-foreground)",
                          }}
                        >
                          {text.slice(0, cut)}
                        </span>
                        <span aria-hidden="true" className="opacity-0">
                          {text.slice(cut)}
                        </span>
                        <span className="sr-only">
                          {complete
                            ? verdict === "ok"
                              ? " (correct)"
                              : " (too vague to check)"
                            : ""}
                        </span>
                      </span>
                    );
                  })}
                </p>
              </motion.div>
            </div>
          </div>

          {/* The ledger. Same three key points throughout — they do not appear
              at the end, they *resolve*, which is the difference between a
              report and a rehearsal. */}
          <div className="border-white/10 border-t bg-[rgba(255,255,255,0.03)] p-4 sm:p-5 lg:border-t-0 lg:border-l lg:p-9">
            <Slug className="block opacity-55">
              Key points from {demo.file}
            </Slug>
            <ul className="mt-4 lg:mt-5">
              {demo.keyPoints.map((point, index) => {
                /* Each point resolves at its own share of the take, so they
                   land one at a time rather than all at the buzzer. */
                const at = ((index + 1) / demo.keyPoints.length) * 0.94;
                const shown = takeT >= at;
                return (
                  <li
                    key={point.point}
                    className="border-white/10 border-t py-2.5 first:border-t-0 first:pt-0 lg:py-4"
                  >
                    <div className="flex items-start gap-3">
                      {/* The verdict lands, it does not fade up. This is the
                          one moment worth noticing in the whole loop: a
                          judgement being made about your explanation. It snaps
                          against a spring and throws a ring outward as it
                          seats, the way a stamp does. */}
                      <span className="relative mt-[0.42rem] flex h-2.5 w-2.5 shrink-0">
                        {shown && !reduceMotion && (
                          <motion.span
                            key={`${demo.id}-${point.point}-ring`}
                            aria-hidden="true"
                            initial={{ scale: 1, opacity: 0.85 }}
                            animate={{ scale: 3.4, opacity: 0 }}
                            transition={{ duration: 0.65, ease: "easeOut" }}
                            className="absolute inset-0"
                            style={{
                              border: `1px solid ${VERDICT_COLOR[point.verdict]}`,
                            }}
                          />
                        )}
                        <motion.span
                          aria-hidden="true"
                          initial={false}
                          animate={{ scale: shown ? 1 : 0.55 }}
                          transition={
                            reduceMotion
                              ? { duration: 0.15 }
                              : { type: "spring", stiffness: 620, damping: 16 }
                          }
                          className="relative h-2.5 w-2.5 transition-colors duration-300"
                          style={{
                            backgroundColor: shown
                              ? VERDICT_COLOR[point.verdict]
                              : "rgba(238,242,248,0.16)",
                          }}
                        />
                      </span>
                      <p
                        className="min-w-0 flex-1 text-[0.93rem] leading-snug transition-opacity duration-500 lg:text-[0.97rem]"
                        style={{ opacity: shown ? 1 : 0.45 }}
                      >
                        {point.point}
                      </p>
                      <motion.span
                        initial={false}
                        animate={{
                          opacity: shown ? 1 : 0,
                          x: shown || reduceMotion ? 0 : 6,
                        }}
                        transition={
                          reduceMotion
                            ? { duration: 0.15 }
                            : { ...transitions.spring, delay: shown ? 0.08 : 0 }
                        }
                        className="mt-[0.15rem] shrink-0 font-mono text-[0.6rem] uppercase leading-[1.5] tracking-[0.13em]"
                        style={{ color: VERDICT_TINT[point.verdict] }}
                      >
                        {VERDICT_LABEL[point.verdict]}
                      </motion.span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* The gap report. Held back until the take is finished, because
                that is when the product has it. Mounted on `lg` and only faded,
                so the panel cannot change height; below `lg` the ledger is
                stacked underneath and the reserved space would be a screen of
                empty navy instead of a column beside the transcript. */}
            <motion.div
              initial={false}
              animate={{
                opacity: settled ? 1 : 0,
                y: settled ? 0 : reduceMotion ? 0 : 8,
              }}
              transition={
                reduceMotion
                  ? { duration: 0.15 }
                  : settled
                    ? transitions.smooth
                    : transitions.exit
              }
              aria-hidden={!settled}
              className={cn(
                "mt-4 border-white/10 border-l-2 pl-4 lg:mt-6 lg:block",
                settled ? "block" : "hidden",
              )}
              style={{ borderLeftColor: "var(--miss)" }}
            >
              <Slug style={{ color: "var(--miss-light)" }}>Never reached</Slug>
              <p className="mt-2 text-[0.98rem] italic leading-snug">
                {demo.missed.phrase}
              </p>
              <p className="mt-2 hidden text-primary-foreground/65 text-sm leading-relaxed lg:block">
                {demo.missed.why}
              </p>
            </motion.div>
          </div>
        </div>

        {/* The cycle, as a hairline. Not a control — there is nothing to drag
            and nothing to press. It is there so a reader who looks up
            mid-sentence can see that this is a loop rather than a video that
            has stalled. */}
        <div
          aria-hidden="true"
          className="h-[2px] w-full origin-left bg-[var(--accent-solid)]/45"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}
