"use client";

import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";
import styles from "./landing.module.css";
import {
  createScheduler,
  markedRuns,
  type ParsedRun,
  parseRuns,
  SpokenLine,
  VerdictMark,
} from "./spoken";
import { useReducedMotion } from "./use-reduced-motion";

/* How it works: three small demos. Each loops on its own, slightly out of
   step, and a reader who asked for reduced motion gets each one's last
   frame instead. */

const UPLOAD_POINTS = [
  "Forces come in pairs",
  "Equal and opposite",
  "They act on different bodies",
];

const SAID = parseRuns([
  { text: "“…so " },
  { text: "forces come in pairs", v: "ok" },
  { text: ", and they're " },
  { text: "equal and opposite", v: "ok" },
  { text: "…”" },
]);

const ANSWER = parseRuns([
  { text: "Because " },
  { text: "they act on different objects", v: "ok" },
  { text: "." },
]);

const waveDelay = (i: number) => ({ animationDelay: `${(i * 170) % 900}ms` });

/** Reveals a take word by word and marks each run as its last word lands. */
function speak(
  at: (ms: number, fn: () => void) => void,
  { runs, total }: { runs: ParsedRun[]; total: number },
  step: number,
  onWord: (n: number) => void,
  onDone: (ri: number) => void,
) {
  for (let i = 0; i < total; i++) {
    at(i * step, () => {
      onWord(i + 1);
      runs.forEach((run, ri) => {
        if (run.v && run.end === i + 1) at(200, () => onDone(ri));
      });
    });
  }
  return total * step;
}

function UploadDemo({ reduced }: { reduced: boolean }) {
  const [cycle, setCycle] = useState(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const { at, clear } = createScheduler();
    const loop = () => {
      setCycle((c) => c + 1);
      setShown(0);
      UPLOAD_POINTS.forEach((_, i) => {
        at(1500 + i * 380, () => setShown(i + 1));
      });
      at(6200, loop);
    };
    loop();
    return clear;
  }, [reduced]);

  return (
    <div className={styles.ui}>
      <span className={styles.doc}>
        <FileText aria-hidden="true" strokeWidth={1.4} className="size-4" />
        forces-notes.pdf
        <span className={styles.bar}>
          <i key={cycle} />
        </span>
      </span>
      {UPLOAD_POINTS.map((point, i) => (
        <span
          key={point}
          className={cn(styles.pl, (reduced || i < shown) && styles.on)}
        >
          <VerdictMark />
          {point}
        </span>
      ))}
    </div>
  );
}

function ExplainDemo({ reduced }: { reduced: boolean }) {
  const [words, setWords] = useState(0);
  const [done, setDone] = useState<number[]>([]);

  useEffect(() => {
    if (reduced) return;
    const { at, clear } = createScheduler();
    const loop = () => {
      setWords(0);
      setDone([]);
      const t = speak(at, SAID, 230, setWords, (ri) =>
        setDone((prev) => [...prev, ri]),
      );
      at(t + 3400, loop);
    };
    at(700, loop);
    return clear;
  }, [reduced]);

  return (
    <div className={styles.ui}>
      <span className={cn(styles.dTop, "font-mono")}>
        <span className={styles.dWave} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <i key={i} style={waveDelay(i)} />
          ))}
        </span>
        <span>00:41</span>
      </span>
      <p className={styles.dSaid}>
        <SpokenLine
          runs={SAID.runs}
          wordsOn={reduced ? SAID.total : words}
          done={reduced ? markedRuns(SAID.runs) : done}
        />
      </p>
    </div>
  );
}

function PracticeDemo({ reduced }: { reduced: boolean }) {
  const [words, setWords] = useState(0);
  const [done, setDone] = useState<number[]>([]);
  const [reached, setReached] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const { at, clear } = createScheduler();
    const loop = () => {
      setWords(0);
      setDone([]);
      setReached(false);
      at(1400, () => {
        const t = speak(at, ANSWER, 260, setWords, (ri) =>
          setDone((prev) => [...prev, ri]),
        );
        at(t + 300, () => setReached(true));
        at(t + 3600, loop);
      });
    };
    at(1400, loop);
    return clear;
  }, [reduced]);

  const ok = reduced || reached;
  return (
    <div className={styles.ui}>
      <span className={cn(styles.dTop, "font-mono")}>
        <VerdictMark v={ok ? "ok" : "miss"} />
        <span className={cn(styles.dLbl, ok && styles.dLblOk)}>
          Different bodies · {ok ? "Explained" : "Not said yet"}
        </span>
      </span>
      <p className={styles.dQ}>
        If the forces are equal and opposite, why don't they cancel out?
      </p>
      <p className={styles.dA}>
        <SpokenLine
          runs={ANSWER.runs}
          wordsOn={reduced ? ANSWER.total : words}
          done={reduced ? markedRuns(ANSWER.runs) : done}
        />
      </p>
    </div>
  );
}

const CARDS = [
  {
    key: "upload",
    title: "Upload your notes",
    body: "Slides, a PDF, or class notes. We pull out the points you need to know.",
    Demo: UploadDemo,
  },
  {
    key: "explain",
    title: "Explain it out loud",
    body: "Talk it through like you're teaching a friend. Each point lights up when you say it.",
    Demo: ExplainDemo,
  },
  {
    key: "practice",
    title: "Practice what you missed",
    body: "One question for each point you skipped, until you can say it.",
    Demo: PracticeDemo,
  },
];

export function MiniDemos() {
  const reduced = useReducedMotion();
  return (
    <section id="how" aria-labelledby="how-heading" className={styles.demos}>
      <h2 id="how-heading" className="sr-only">
        How it works
      </h2>
      {CARDS.map(({ key, title, body, Demo }) => (
        <div key={key} className={styles.demo}>
          <div aria-hidden="true">
            <Demo reduced={reduced} />
          </div>
          <h3>{title}</h3>
          <p className={styles.demoBody}>{body}</p>
        </div>
      ))}
    </section>
  );
}
