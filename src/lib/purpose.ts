/**
 * What a course is for.
 *
 * One product, two reasons to open it. `study` is learning material somebody
 * else wrote; `talk` is rehearsing something you are going to say out loud.
 *
 * The machinery underneath is the same, and that is the point rather than a
 * shortcut: explaining a chapter and delivering a talk are the same act
 * measured the same way. Key points are either the ideas a topic contains or
 * the points you meant to make; a gap is either something you did not
 * understand or something you skipped; pace and hesitation mean what they
 * always meant. Only the framing changes, so this file holds the words rather
 * than a second pipeline.
 */

export const PURPOSES = ["study", "talk"] as const;
export type Purpose = (typeof PURPOSES)[number];

export function isPurpose(value: unknown): value is Purpose {
  return (
    typeof value === "string" && (PURPOSES as readonly string[]).includes(value)
  );
}

/** Falls back to `study`, which is what every course predating this was. */
export function toPurpose(value: unknown): Purpose {
  return isPurpose(value) ? value : "study";
}

type PurposeCopy = {
  /** The chooser at creation. */
  label: string;
  blurb: string;
  /** What the material is, in the language of this purpose. */
  sourceHint: string;
  /** What the recording is called once it exists. */
  runLabel: string;
  /** Heading over the points that were never reached. */
  missedHeading: string;
  /** Heading over the number at the top of the report. */
  scoreHeading: string;
};

export const PURPOSE_COPY: Record<Purpose, PurposeCopy> = {
  study: {
    label: "Study a topic",
    blurb:
      "Upload notes, slides or a chapter. A short course is built from them, and you explain it back.",
    sourceHint: "Your notes, slides or a chapter",
    runLabel: "Explanation",
    missedHeading: "Not covered yet",
    scoreHeading: "Knowledge score",
  },
  talk: {
    label: "Rehearse a talk",
    blurb:
      "Upload your slides or outline. You deliver it out loud and find out which points you skipped, and how you sounded.",
    sourceHint: "Your slides, script or outline",
    runLabel: "Run-through",
    /* "Not covered yet" reads as a gap in understanding, which is the wrong
       accusation for a rehearsal: you know the point, you did not say it. */
    missedHeading: "Points you skipped",
    /* Not "knowledge". Nobody rehearsing a talk they wrote is being told
       whether they know it — the number is how much of their own material
       they actually got through. */
    scoreHeading: "Points covered",
  },
};

export function purposeCopy(value: unknown): PurposeCopy {
  return PURPOSE_COPY[toPurpose(value)];
}
