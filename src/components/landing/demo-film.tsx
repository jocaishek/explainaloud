"use client";

import { FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";
import styles from "./landing.module.css";
import {
  createScheduler,
  markedRuns,
  parseRuns,
  type Run,
  SpokenLine,
  type Verdict,
  VerdictMark,
} from "./spoken";
import { useReducedMotion } from "./use-reduced-motion";

/* The film: a browser window fills itself in, the topic is explained into
   it, and what was missed comes back. It runs like a video, on one clock,
   with a cursor that does the clicking. Nothing in it is clickable. */

type Film = {
  topic: string;
  file: string;
  points: string[];
  runs: Run[];
  q: string;
};

const FILMS: Film[] = [
  {
    topic: "Newton's third law",
    file: "forces-notes.pdf",
    points: [
      "Forces come in pairs",
      "Equal in size, opposite in direction",
      "Felt as a reaction",
      "They act on different bodies",
    ],
    runs: [
      { text: "Newton's third law says " },
      { text: "forces come in pairs", v: "ok", p: 0 },
      { text: ", " },
      { text: "equal and opposite", v: "ok", p: 1 },
      { text: ". So push a wall and the wall " },
      { text: "kind of pushes back", v: "vague", p: 2 },
      { text: " on you." },
    ],
    q: "If the forces are equal and opposite, why don't they cancel out?",
  },
  {
    topic: "The New Deal",
    file: "us-history-unit6.pdf",
    points: [
      "Roosevelt's response to the Depression",
      "Relief, recovery, reform",
      "Programs like the CCC",
      "Parts were struck down",
    ],
    runs: [
      { text: "The New Deal was " },
      { text: "Roosevelt's response to the Depression", v: "ok", p: 0 },
      { text: ". It had " },
      { text: "a lot of programs", v: "vague", p: 1 },
      { text: ", like " },
      { text: "the CCC and Social Security", v: "ok", p: 2 },
      { text: "." },
    ],
    q: "Why did the Supreme Court strike down parts of the New Deal?",
  },
  {
    topic: "Cell division",
    file: "biology-ch7.pdf",
    points: [
      "DNA is copied first",
      "Chromosomes line up",
      "They are pulled apart",
      "Each cell keeps the full count",
    ],
    runs: [
      { text: "Before anything splits, " },
      { text: "the cell copies all of its DNA", v: "ok", p: 0 },
      { text: ". Then the chromosomes " },
      { text: "sort of get sorted out", v: "vague", p: 1 },
      { text: " and " },
      { text: "pulled to opposite ends", v: "ok", p: 2 },
      { text: "." },
    ],
    q: "How does each new cell end up with the full set of chromosomes?",
  },
];

const PARSED = FILMS.map((film) => parseRuns(film.runs));

const LABEL: Record<Verdict, string> = {
  ok: "Explained",
  vague: "Too vague",
  miss: "Not said yet",
};

const STEP = 290;
const URL_NEW = "explainaloud.com/new";
const URL_RECORD = "explainaloud.com/record";
const URL_PRACTICE = "explainaloud.com/practice";

type Scene = {
  film: number;
  view: "setup" | "take" | "ask";
  url: string;
  typed: number;
  typing: boolean;
  drop: "empty" | "hot" | "has";
  listed: boolean;
  pointsIn: number;
  verdicts: (Verdict | null)[];
  wordsOn: number;
  doneRuns: number[];
  clock: string;
  recDone: boolean;
  tally: boolean;
  pressed: "go" | "practice" | null;
};

const opening = (film: number): Scene => ({
  film,
  view: "setup",
  url: URL_NEW,
  typed: 0,
  typing: false,
  drop: "empty",
  listed: false,
  pointsIn: 0,
  verdicts: FILMS[film].points.map(() => null),
  wordsOn: 0,
  doneRuns: [],
  clock: "00:00",
  recDone: false,
  tally: false,
  pressed: null,
});

/** A still of the middle beat, for readers who asked for reduced motion. */
const STILL: Scene = (() => {
  const film = FILMS[0];
  const parsed = PARSED[0];
  return {
    ...opening(0),
    view: "take",
    url: URL_RECORD,
    listed: true,
    pointsIn: film.points.length,
    verdicts: film.points.map(
      (_, i) => film.runs.find((run) => run.p === i)?.v ?? "miss",
    ),
    wordsOn: parsed.total,
    doneRuns: markedRuns(parsed.runs),
  };
})();

const FileGlyph = () => (
  <FileText aria-hidden="true" strokeWidth={1.4} className="size-4" />
);

export function DemoFilm() {
  const reduced = useReducedMotion();
  const [scene, setScene] = useState<Scene>(() => opening(0));
  const [ring, setRing] = useState<{ x: number; y: number; id: number }>();

  const bodyRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<SVGSVGElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const goRef = useRef<HTMLButtonElement>(null);
  const practiceRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (reduced) return;
    const body = bodyRef.current;
    const cursor = cursorRef.current;
    const chip = chipRef.current;
    if (!body || !cursor || !chip) return;

    let cancelled = false;
    let ringId = 0;
    const schedule = createScheduler();
    const at = schedule.at;
    const set = (patch: Partial<Scene>) =>
      setScene((prev) => ({ ...prev, ...patch }));

    type Point = [number, number];
    // Positions are read off the window at the moment they are needed, so
    // the cursor lands on the button at any width.
    const spot = (el: Element | null, fx = 0.5, fy = 0.5): Point => {
      if (!el) return [0, 0];
      const b = body.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return [r.left - b.left + r.width * fx, r.top - b.top + r.height * fy];
    };
    const move = (node: HTMLElement | SVGElement, [x, y]: Point, ms = 900) => {
      node.style.transition = `transform ${ms}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms cubic-bezier(0.22, 1, 0.36, 1)`;
      node.style.transform = `translate(${x}px, ${y}px)`;
    };
    const jump = (node: HTMLElement | SVGElement, [x, y]: Point) => {
      node.style.transition = "none";
      node.style.transform = `translate(${x}px, ${y}px)`;
    };
    const click = (which: "go" | "practice", el: Element | null) => {
      const [x, y] = spot(el);
      ringId += 1;
      const id = ringId;
      setRing({ x, y, id });
      at(600, () => setRing((prev) => (prev?.id === id ? undefined : prev)));
      set({ pressed: which });
      at(180, () => set({ pressed: null }));
    };

    const play = (n: number) => {
      schedule.clear();
      const fi = n % FILMS.length;
      const film = FILMS[fi];
      const { runs, total } = PARSED[fi];
      const W = body.clientWidth;
      const H = body.clientHeight;

      setScene(opening(fi));
      setRing(undefined);
      chip.style.opacity = "0";
      cursor.style.opacity = "1";
      jump(cursor, [W * 0.62, H * 0.9]);

      // Beat 1: type the topic, drag the notes in, start.
      let t = 500;
      at(t, () => {
        move(cursor, spot(fieldRef.current, 0.3));
        set({ typing: true });
      });
      t += 1000;
      for (let i = 0; i < film.topic.length; i++) {
        at(t + i * 55, () => set({ typed: i + 1 }));
      }
      t += film.topic.length * 55 + 300;
      at(t, () => {
        set({ typing: false });
        const start: Point = [W * 0.9, H * 0.14];
        jump(chip, start);
        move(cursor, [start[0] + 14, start[1] + 14], 800);
      });
      t += 850;
      at(t, () => {
        chip.style.opacity = "1";
        const [x, y] = spot(dropRef.current, 0.42);
        move(chip, [x - 60, y - 16], 1300);
        move(cursor, [x - 46, y - 2], 1300);
      });
      at(t + 700, () => set({ drop: "hot" }));
      t += 1400;
      at(t, () => {
        chip.style.opacity = "0";
        set({ drop: "empty", listed: true });
        at(220, () => set({ drop: "has" }));
        film.points.forEach((_, i) => {
          at(250 + i * 160, () => set({ pointsIn: i + 1 }));
        });
      });
      t += 1100;
      at(t, () => move(cursor, spot(goRef.current, 0.4, 0.6), 800));
      t += 850;
      at(t, () => click("go", goRef.current));
      t += 300;

      // Beat 2: the take, marked while it is said.
      at(t, () => {
        set({ view: "take", url: URL_RECORD });
        move(cursor, [W * 0.66, H * 0.92], 900);
      });
      t += 600;
      for (let i = 0; i < total; i++) {
        at(t + i * STEP, () => {
          const seconds = Math.round(((i * STEP) / 1000) * 2.2);
          set({
            wordsOn: i + 1,
            clock: `00:${String(seconds).padStart(2, "0")}`,
          });
          runs.forEach((run, ri) => {
            const { v, p } = run;
            if (run.end !== i + 1 || !v || p === undefined) return;
            at(240, () =>
              setScene((prev) => ({
                ...prev,
                doneRuns: [...prev.doneRuns, ri],
                verdicts: prev.verdicts.map((old, k) => (k === p ? v : old)),
              })),
            );
          });
        });
      }
      t += total * STEP + 700;
      at(t, () =>
        setScene((prev) => ({
          ...prev,
          verdicts: prev.verdicts.map((v) => v ?? "miss"),
          recDone: true,
          tally: true,
        })),
      );
      t += 1300;
      at(t, () => move(cursor, spot(practiceRef.current, 0.35, 0.6), 900));
      t += 950;
      at(t, () => click("practice", practiceRef.current));
      t += 300;

      // Beat 3: the point never reached comes back as a question.
      at(t, () => {
        set({ view: "ask", url: URL_PRACTICE });
        cursor.style.opacity = "0";
      });
      t += 3800;
      at(t, () => play(n + 1));
    };

    document.fonts.ready.then(() => {
      if (!cancelled) play(0);
    });

    return () => {
      cancelled = true;
      schedule.clear();
    };
  }, [reduced]);

  const s = reduced ? STILL : scene;
  const film = FILMS[s.film];
  const { runs } = PARSED[s.film];
  const count = (v: Verdict) => s.verdicts.filter((x) => x === v).length;
  const missIndex = s.verdicts.indexOf("miss");
  const missed = missIndex >= 0 ? film.points[missIndex] : undefined;

  return (
    <div
      role="img"
      aria-label="An example of the app in use: a student types a topic, drops in their notes, explains it out loud, sees each point marked as explained, too vague or not said yet, then practises the point they missed"
      className={styles.win}
    >
      <div className={styles.chrome}>
        <span className={styles.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={cn(styles.url, "font-mono")}>{s.url}</span>
        <span className={styles.authored}>Example</span>
      </div>
      <div ref={bodyRef} className={styles.body}>
        <div className={styles.pane}>
          {/* Beat 1: set up */}
          <div className={cn(styles.view, s.view === "setup" && styles.on)}>
            <span className={styles.lbl}>What are you explaining?</span>
            <div
              ref={fieldRef}
              className={cn(styles.fieldBox, s.typing && styles.typingOn)}
            >
              <span>{film.topic.slice(0, s.typed)}</span>
              <i className={styles.caret} />
            </div>
            <span className={styles.lbl}>Your notes</span>
            <div
              ref={dropRef}
              className={cn(
                styles.drop,
                s.drop === "hot" && styles.hot,
                s.drop === "has" && styles.has,
              )}
            >
              <span className={styles.dropEmpty}>
                Drag a PDF or your notes here
              </span>
              <span className={styles.dropped}>
                <FileGlyph />
                <b>{film.file}</b>
                <small>uploaded</small>
              </span>
            </div>
            <button
              ref={goRef}
              type="button"
              tabIndex={-1}
              className={cn(styles.go, s.pressed === "go" && styles.press)}
            >
              Start explaining
            </button>
          </div>

          {/* Beat 2: the take */}
          <div className={cn(styles.view, s.view === "take" && styles.on)}>
            <div className={styles.rechead}>
              <span
                className={cn(
                  styles.dot,
                  s.recDone ? styles.dotDone : styles.dotLive,
                )}
              />
              <span>
                <b>{s.recDone ? "Marked against your notes" : "Recording"}</b>
                <span className={cn(styles.mono, "font-mono")}>{s.clock}</span>
              </span>
              <span
                className={cn(styles.wave, s.recDone && styles.quiet)}
                aria-hidden="true"
              >
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <span
                    key={i}
                    style={{ animationDelay: `${(i * 170) % 900}ms` }}
                  />
                ))}
              </span>
            </div>
            <p className={styles.line}>
              <SpokenLine runs={runs} wordsOn={s.wordsOn} done={s.doneRuns} />
            </p>
            <div className={cn(styles.tally, s.tally && styles.on)}>
              <span className={styles.sum}>
                <span>
                  <VerdictMark v="ok" />
                  {count("ok")} explained
                </span>
                <span>
                  <VerdictMark v="vague" />
                  {count("vague")} too vague
                </span>
                <span>
                  <VerdictMark v="miss" />
                  {count("miss")} not said yet
                </span>
              </span>
              <button
                ref={practiceRef}
                type="button"
                tabIndex={-1}
                className={cn(
                  styles.go,
                  s.pressed === "practice" && styles.press,
                )}
              >
                Practice what you missed
              </button>
            </div>
          </div>

          {/* Beat 3: what you missed */}
          <div className={cn(styles.view, s.view === "ask" && styles.on)}>
            <span className={styles.from}>
              <VerdictMark v="miss" />
              {missed ? `${missed} · ${LABEL.miss}` : null}
            </span>
            <p className={styles.q}>{film.q}</p>
            <div className={cn(styles.rechead, styles.recheadSmall)}>
              <span className={cn(styles.dot, styles.dotLive)} />
              <span className={cn(styles.mono, "font-mono")}>
                Answer out loud
              </span>
            </div>
          </div>
        </div>

        <aside className={styles.points}>
          <h3>Points from your notes</h3>
          {s.listed ? (
            <ol>
              {film.points.map((point, i) => {
                const v = s.verdicts[i];
                return (
                  <li
                    key={point}
                    data-v={v ?? undefined}
                    className={cn(i < s.pointsIn && styles.in)}
                  >
                    <VerdictMark v={v} className={styles.pointMark} />
                    <span>
                      {point}
                      <span className={styles.status}>
                        {v ? LABEL[v] : null}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={styles.empty}>
              They show up here once your notes are in.
            </p>
          )}
        </aside>

        <div ref={chipRef} className={cn(styles.chip, "font-mono")}>
          <FileGlyph />
          <span>{film.file}</span>
        </div>
        <svg
          ref={cursorRef}
          className={styles.cursor}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M4 2.5v13.2l3.6-3.4 2.4 5.4 2.3-1-2.4-5.3h5z" />
        </svg>
        {ring ? (
          <span
            key={ring.id}
            className={styles.ring}
            style={{ left: ring.x, top: ring.y }}
          />
        ) : null}
      </div>
    </div>
  );
}
