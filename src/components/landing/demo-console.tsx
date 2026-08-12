"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Pause, Play, RotateCcw } from "lucide-react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEMOS, type PointVerdict } from "~/components/landing/demo-data";
import { transitions } from "~/components/landing/motion-presets";
import { cn } from "~/lib/utils";

/**
 * The product, running.
 *
 * Everything else on this page *describes* the loop — a checklist that fills
 * in, three verdicts that cycle, a transcript already marked. A reader who has
 * not used it still has to take our word for how the pieces connect, because a
 * still frame cannot show a sequence, and a sequence is the entire product:
 * material goes in, you talk, claims resolve against it while you are still
 * talking.
 *
 * So this one runs. Press play and the take types itself in at speaking pace;
 * the marks land under the words as each claim finishes; the key points on the
 * right resolve one at a time; and what is left over is the gap report. It is
 * scrubbable, replayable, and it switches subject, because the range is part
 * of the argument.
 *
 * **Nothing here calls a model.** The takes are authored — `design.md` bans
 * invented proof on the landing, and a live endpoint on a marketing page is an
 * unauthenticated bill waiting to happen. The panel says "authored example" in
 * its own corner rather than letting anyone infer otherwise.
 *
 * The clock is derived from progress rather than counted, so a scrub backwards
 * moves it backwards. A timer that only ever goes up is the tell that the
 * numbers on a demo are set dressing.
 */

/** How long one take takes to speak, in milliseconds. */
const RUN_MS = 9000;

/** Speaking pace, shown in the header. Real, in the sense that it is the pace
 *  the reveal actually runs at — derived below rather than typed in. */
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
  const [playing, setPlaying] = useState(false);
  const startedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const demo = DEMOS.find((entry) => entry.id === demoId) ?? DEMOS[0];

  /* The take, measured once per subject. Characters rather than words, because
     a word-at-a-time reveal on display type reads as a slideshow — and because
     the underline has to be able to wipe *across* a phrase, which needs a
     position inside it. */
  const { chars, total, words } = useMemo(() => {
    let running = 0;
    const chars = demo.take.map(([text, verdict]) => {
      const start = running;
      running += text.length;
      return { text, verdict, start, end: running };
    });
    return {
      chars,
      total: running,
      words: demo.take.reduce((sum, [text]) => sum + WORDS(text), 0),
    };
  }, [demo]);

  const done = progress >= 1;
  const revealed = Math.round(progress * total);

  const restart = useCallback(() => {
    setProgress(0);
    setPlaying(true);
  }, []);

  /* One frame loop for the whole thing. `progress` is the only clock: the
     transcript, the ledger, the timecode and the rail all read from it, so
     they cannot drift apart the way four independent intervals would. */
  useEffect(() => {
    if (!playing || reduceMotion) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      /* The updater is pure. Calling `setPlaying` from inside it, which is
         what this did first, is a side effect in a function React is entitled
         to run more than once. In development it does exactly that, so the
         stop was being issued twice on the frame the take completed. The
         effect below watches for the end instead, which is the one place that
         decision actually belongs. */
      setProgress((current) => Math.min(1, current + delta / RUN_MS));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduceMotion]);

  // The run ends itself, rather than the frame loop reaching in to stop it.
  useEffect(() => {
    if (progress >= 1) setPlaying(false);
  }, [progress]);

  /* It plays itself, once, when it is first looked at — the same reason a
     product video autoplays. After that every start is the reader's. Anyone
     who has asked not to be moved gets the finished frame instead. */
  useEffect(() => {
    if (reduceMotion) {
      setProgress(1);
      return;
    }
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || startedRef.current) return;
        startedRef.current = true;
        setPlaying(true);
      },
      { threshold: 0.15 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [reduceMotion]);

  function pick(id: string) {
    setDemoId(id);
    setProgress(0);
    setPlaying(!reduceMotion);
  }

  /* Derived, not counted. Scrub back and the clock goes back with you. */
  const elapsed = progress * (RUN_MS / 1000);
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(
    Math.floor(elapsed % 60),
  ).padStart(2, "0")}`;
  const wpm = Math.round(words / (RUN_MS / 1000 / 60));

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

      <div className="mt-5 overflow-hidden rounded-[20px] border border-white/12 bg-[var(--panel-deep)] text-primary-foreground shadow-[10px_12px_0_rgba(15,35,64,0.18)]">
        {/* The header is the recorder. Everything in it is derived from the one
            clock, so nothing in it can be running while the take is paused. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-white/10 border-b px-4 py-3 lg:px-7 lg:py-4">
          <span className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              {playing && !reduceMotion && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--miss)] opacity-70" />
              )}
              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor: playing
                    ? "var(--miss)"
                    : "rgba(238,242,248,0.3)",
                }}
              />
            </span>
            <Slug>{playing ? "Recording" : done ? "Marked" : "Paused"}</Slug>
          </span>
          <Slug className="tabular-nums opacity-70">{clock}</Slug>
          <Slug className="tabular-nums opacity-70">{wpm} wpm</Slug>
          <span className="ml-auto hidden min-w-0 truncate lg:block">
            <Slug className="opacity-55">From {demo.file}</Slug>
          </span>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          {/* The take. Untyped text is present and transparent rather than
              absent, so the panel is its final height on the first frame —
              otherwise the page grows under the reader for nine seconds,
              which is the exact complaint that killed the last version of
              this section. */}
          <div className="flex flex-col p-4 sm:p-5 lg:min-h-[24rem] lg:p-10">
            <p className="font-display text-[1.15rem] leading-[1.45] tracking-[-0.01em] sm:text-[1.45rem] sm:leading-[1.38] lg:text-[clamp(1.5rem,2.1vw,2.1rem)] lg:leading-[1.32] lg:tracking-[-0.02em]">
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

            {/* Transport. The rail is a real range input: a demo you can only
                watch is a video, and a video is what this is trying not to
                be. Dragging it re-marks the take from wherever you land,
                because every mark is computed from progress. */}
            <div className="mt-auto flex items-center gap-4 pt-6 lg:pt-8">
              <button
                type="button"
                onClick={() => (done ? restart() : setPlaying((p) => !p))}
                aria-label={done ? "Replay" : playing ? "Pause" : "Play"}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-solid)] text-[var(--brand-foreground)] transition-transform duration-200 hover:scale-105"
              >
                {done ? (
                  <RotateCcw className="h-4 w-4" />
                ) : playing ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="ml-0.5 h-4 w-4" />
                )}
              </button>
              <label className="min-w-0 flex-1">
                <span className="sr-only">Scrub the rehearsal</span>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  value={Math.round(progress * 1000)}
                  onChange={(event) => {
                    setPlaying(false);
                    setProgress(Number(event.target.value) / 1000);
                  }}
                  className="lp-scrub w-full"
                  style={
                    { "--lp-scrub": `${progress * 100}%` } as CSSProperties
                  }
                />
              </label>
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
                const settled = progress >= at;
                return (
                  <li
                    key={point.point}
                    className="border-white/10 border-t py-2.5 first:border-t-0 first:pt-0 lg:py-4"
                  >
                    <div className="flex items-start gap-3">
                      {/* The verdict lands, it does not fade up.
                          This was a colour transition, which is the quietest
                          possible way to say "a judgement has just been made
                          about your explanation" — the one moment in the whole
                          demo that is worth noticing. Now the square snaps to
                          size against a spring and throws a ring outward as it
                          seats, the way a stamp does. The ring is a pure
                          transform on a pseudo-layer, so the whole thing is
                          one composited pop and costs nothing. */}
                      <span className="relative mt-[0.42rem] flex h-2.5 w-2.5 shrink-0">
                        {settled && !reduceMotion && (
                          <motion.span
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
                          animate={{ scale: settled ? 1 : 0.55 }}
                          transition={
                            reduceMotion
                              ? { duration: 0.15 }
                              : { type: "spring", stiffness: 620, damping: 16 }
                          }
                          className="relative h-2.5 w-2.5 transition-colors duration-300"
                          style={{
                            backgroundColor: settled
                              ? VERDICT_COLOR[point.verdict]
                              : "rgba(238,242,248,0.16)",
                          }}
                        />
                      </span>
                      <p
                        className="min-w-0 flex-1 text-[0.93rem] leading-snug transition-opacity duration-500 lg:text-[0.97rem]"
                        style={{ opacity: settled ? 1 : 0.45 }}
                      >
                        {point.point}
                      </p>
                      {/* The label arrives with the stamp, from slightly
                          right, so the eye reads dot then word in the order
                          the product decides them. */}
                      <motion.span
                        initial={false}
                        animate={{
                          opacity: settled ? 1 : 0,
                          x: settled || reduceMotion ? 0 : 6,
                        }}
                        transition={
                          reduceMotion
                            ? { duration: 0.15 }
                            : {
                                ...transitions.spring,
                                delay: settled ? 0.08 : 0,
                              }
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
                that is when the product has it — showing it early would be
                the demo telling you the answer before the question. */}
            {/* Reserved on desktop, not on mobile.
                Holding the space with `opacity: 0` is what stops the panel
                resizing as the run finishes, and on a two column layout that
                space is beside the transcript and costs nothing. Stacked on
                one column it is a screen of empty navy under the key points
                for the whole run, which is worse than the resize it prevents.
                So below `lg` it is genuinely absent until there is something
                to say, and the panel grows once, at the end, after the reader
                has finished watching. */}
            {/* Animated in place rather than mounted and unmounted.
                `AnimatePresence` was the obvious choice and it was wrong here:
                removing the node from the tree also removes the space it was
                holding, and on the two column layout that space is what keeps
                the panel from changing height when the run completes. It
                measured a 32px jump, 408 to 440, which is the exact class of
                resize this panel was built to avoid.

                So on `lg` it is always mounted and only its opacity moves.
                Below `lg` it stays unmounted until there is something to say,
                because there the ledger is stacked underneath and the reserved
                space would be a screen of empty navy instead of a column
                beside the transcript. Same component, opposite correct
                answers, decided by which one costs the reader more. */}
            <motion.div
              initial={false}
              animate={
                done
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: reduceMotion ? 0 : 8 }
              }
              transition={
                reduceMotion
                  ? { duration: 0.15 }
                  : done
                    ? transitions.smooth
                    : transitions.exit
              }
              aria-hidden={!done}
              className={cn(
                "mt-4 border-white/10 border-l-2 pl-4 lg:mt-6 lg:block",
                done ? "block" : "hidden",
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
      </div>
    </div>
  );
}
