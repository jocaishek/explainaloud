import { cn } from "~/lib/utils";
import styles from "./landing.module.css";

/**
 * A take, as the landing shows it: phrases that are revealed one word at a
 * time and underlined in their verdict colour the moment the last word of
 * the phrase is said.
 *
 * Shared by the film and the small demo cards. Everything here is derived
 * from props, so the same component renders a moving frame and a still.
 */

export type Verdict = "ok" | "vague" | "miss";

/** One phrase of a take. `v` marks it, `p` names the point it reaches. */
export type Run = { text: string; v?: "ok" | "vague"; p?: number };

export type ParsedRun = Run & {
  parts: { text: string; word: number | null }[];
  /** Number of words said once this run's last word is on. */
  end: number;
};

export function parseRuns(runs: Run[]): { runs: ParsedRun[]; total: number } {
  let word = 0;
  const parsed = runs.map((run) => {
    const parts = run.text
      .split(/(\s+)/)
      .filter((part) => part.length > 0)
      .map((part) =>
        /^\s+$/.test(part)
          ? { text: part, word: null }
          : { text: part, word: word++ },
      );
    return { ...run, parts, end: word };
  });
  return { runs: parsed, total: word };
}

/** The indices of the runs that carry a verdict, i.e. every run marked. */
export function markedRuns(runs: ParsedRun[]): number[] {
  return runs.flatMap((run, i) => (run.v ? [i] : []));
}

export function SpokenLine({
  runs,
  wordsOn,
  done,
}: {
  runs: ParsedRun[];
  wordsOn: number;
  done: readonly number[];
}) {
  return runs.map((run, ri) => (
    <span
      // The runs are static data in a fixed order.
      // biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
      key={ri}
      className={cn(
        styles.run,
        run.v === "ok" && styles.runOk,
        run.v === "vague" && styles.runVague,
        done.includes(ri) && styles.done,
      )}
    >
      {run.parts.map((part, pi) =>
        part.word === null ? (
          part.text
        ) : (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
            key={pi}
            className={cn(styles.word, part.word < wordsOn && styles.on)}
          >
            {part.text}
          </span>
        ),
      )}
    </span>
  ));
}

/** The verdict glyph: filled, half filled, dashed ring; neutral when unset. */
export function VerdictMark({
  v,
  className,
}: {
  v?: Verdict | null;
  className?: string;
}) {
  return (
    <i
      aria-hidden="true"
      className={cn(
        styles.vm,
        v === "ok" && styles.vmOk,
        v === "vague" && styles.vmVague,
        v === "miss" && styles.vmMiss,
        className,
      )}
    />
  );
}

/** Schedules timeouts and clears whichever are still pending in one call. */
export function createScheduler() {
  const ids = new Set<number>();
  return {
    at(ms: number, fn: () => void) {
      const id = window.setTimeout(() => {
        ids.delete(id);
        fn();
      }, ms);
      ids.add(id);
    },
    clear() {
      for (const id of ids) window.clearTimeout(id);
      ids.clear();
    },
  };
}
