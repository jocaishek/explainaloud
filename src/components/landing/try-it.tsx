"use client";

import { type CSSProperties, useState } from "react";
import { cn } from "~/lib/utils";

/**
 * The whole loop, walked at the reader's pace.
 *
 * Every other demonstration on this page shows one slice: the hero marks a
 * take, 03 scrubs one, 05 toggles the source rule. Each is honest and none of
 * them answers "what is it actually like to use this", because the thing the
 * product does is a sequence — material goes in, a course comes out of it, you
 * talk, you read back what you missed. A slice cannot show a sequence.
 *
 * **Authored, not live.** Nothing here calls a model. PRODUCT.md forbids
 * invented proof, and a live box would also mean paying per visitor and
 * running an unauthenticated prompt endpoint on the marketing page. Everything
 * below is written the way the grader would actually mark it, and the panel
 * says so in the corner.
 *
 * **Three subjects, and they are the page's own.** Physics is the hero's take,
 * chemistry is 03's, American history is 05's course. Re-using them rather
 * than inventing three more keeps the page one world, and it makes the point
 * the subjects were chosen for in the first place: this is not a biology tool.
 *
 * The verdict colours here are verdicts — a claim the grader would pass, one
 * too vague to check, one never reached. That is the only thing they are
 * allowed to be.
 */

type Verdict = "ok" | "vague";
type Run = readonly [text: string, verdict: Verdict | "plain"];

type Demo = {
  id: string;
  subject: string;
  topic: string;
  file: string;
  /** A couple of lines of what was uploaded. */
  excerpt: string;
  /** What the course pulled out, each tied to a quote from the file. */
  keyPoints: readonly { readonly point: string; readonly quote: string }[];
  /** The spoken take, marked. */
  take: readonly Run[];
  /** The claim that was never reached, and what to do about it. */
  missed: { readonly phrase: string; readonly why: string };
  /** The vague claim, and what would have made it checkable. */
  vague: { readonly phrase: string; readonly why: string };
};

const DEMOS: readonly Demo[] = [
  {
    id: "physics",
    subject: "Physics",
    topic: "Newton's third law",
    file: "forces-notes.pdf",
    excerpt:
      "For every action there is an equal and opposite reaction. The two forces are equal in magnitude and opposite in direction, and — crucially — they act on different bodies, which is why they never cancel.",
    keyPoints: [
      {
        point: "Forces occur in pairs",
        quote: "For every action there is an equal and opposite reaction.",
      },
      {
        point: "The pair is equal in size, opposite in direction",
        quote: "equal in magnitude and opposite in direction",
      },
      {
        point: "The two forces act on different bodies",
        quote: "they act on different bodies, which is why they never cancel",
      },
    ],
    take: [
      ["Newton's third law: forces come in pairs, ", "plain"],
      ["equal and opposite", "ok"],
      [". So push a wall and the wall ", "plain"],
      ["kind of pushes back", "vague"],
      [". That is why ", "plain"],
      ["you feel it in your hand", "ok"],
      [".", "plain"],
    ],
    missed: {
      phrase: "the two forces act on different objects",
      why: "This is the step that explains why the pair does not cancel out. Without it the law sounds like a contradiction.",
    },
    vague: {
      phrase: "kind of pushes back",
      why: "Says a reaction happens, not that it is equal in size and opposite in direction. Nothing here could be marked right or wrong.",
    },
  },
  {
    id: "chemistry",
    subject: "Chemistry",
    topic: "Ionic bonding",
    file: "bonding-ch4.pdf",
    excerpt:
      "In an ionic bond one atom transfers an electron to another. Both become ions carrying opposite charges, and it is the electrostatic attraction between those charges that holds the lattice together.",
    keyPoints: [
      {
        point: "One atom transfers an electron to another",
        quote: "one atom transfers an electron to another",
      },
      {
        point: "Both become ions with opposite charges",
        quote: "Both become ions carrying opposite charges",
      },
      {
        point: "Electrostatic attraction holds the lattice together",
        quote:
          "it is the electrostatic attraction between those charges that holds the lattice together",
      },
    ],
    take: [
      ["An ionic bond is one atom ", "plain"],
      ["giving an electron to another", "ok"],
      [". They end up ", "plain"],
      ["with opposite charges", "ok"],
      [" and ", "plain"],
      ["stick together somehow", "vague"],
      [".", "plain"],
    ],
    missed: {
      phrase: "the attraction between the ions is electrostatic",
      why: "Naming the force is what turns a description of what happens into an explanation of why it happens.",
    },
    vague: {
      phrase: "stick together somehow",
      why: "“Somehow” is the word doing the work. The mechanism is the answer, and it is the part that was skipped.",
    },
  },
  {
    id: "history",
    subject: "American history",
    topic: "The Stamp Act",
    file: "revolution-notes.docx",
    excerpt:
      "The Stamp Act of 1765 taxed printed paper in the colonies — newspapers, pamphlets, legal documents. It was the first direct tax Parliament had levied on the colonies, and the objection was constitutional rather than financial: taxation without representation.",
    keyPoints: [
      {
        point: "It taxed printed paper in the colonies",
        quote:
          "taxed printed paper in the colonies — newspapers, pamphlets, legal documents",
      },
      {
        point: "It was the first direct tax on the colonies",
        quote: "the first direct tax Parliament had levied on the colonies",
      },
      {
        point: "The objection was constitutional, not financial",
        quote:
          "the objection was constitutional rather than financial: taxation without representation",
      },
    ],
    take: [
      ["The Stamp Act taxed ", "plain"],
      ["printed paper — newspapers, legal documents", "ok"],
      [". Colonists were angry because ", "plain"],
      ["they had no say in it", "ok"],
      [", though I think it was ", "plain"],
      ["mostly about the money", "vague"],
      [".", "plain"],
    ],
    missed: {
      phrase: "it was the first direct tax Parliament levied on the colonies",
      why: "This is why this particular tax caused a crisis when earlier trade duties had not.",
    },
    vague: {
      phrase: "mostly about the money",
      why: "Your source says the opposite — the objection was constitutional. A claim that contradicts the material cannot be marked correct.",
    },
  },
];

const STEPS = [
  { slug: "Step 1", label: "Your material" },
  { slug: "Step 2", label: "The course" },
  { slug: "Step 3", label: "Your take" },
  { slug: "Step 4", label: "The gaps" },
] as const;

/** Small tracked mono, matching the page's only label voice. */
function Slug({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[0.68rem] uppercase leading-[1.5] tracking-[0.09em] opacity-70",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A marked run, in its finished state.
 *
 * The live page animates the rule wiping across the words; here the marks
 * simply fade up in order when the step opens, which is enough to read as
 * grading without turning a static panel into another thing that moves. The
 * italic carries the verdict for anyone who cannot separate the three hues.
 */
function Mark({
  run,
  shown,
  delay,
}: {
  run: Run;
  shown: boolean;
  delay: number;
}) {
  const [text, verdict] = run;
  if (verdict === "plain") return <>{text}</>;

  return (
    <>
      <span
        className="italic transition-[color,background-size] duration-500"
        style={
          {
            backgroundImage: `linear-gradient(var(--${verdict}), var(--${verdict}))`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "0 100%",
            backgroundSize: shown ? "100% 2px" : "0% 2px",
            color: shown ? `var(--${verdict})` : undefined,
            transitionDelay: `${delay}ms`,
          } as CSSProperties
        }
      >
        {text}
      </span>
      <span className="sr-only">
        {verdict === "ok" ? " (correct)" : " (too vague to check)"}
      </span>
    </>
  );
}

export function TryIt() {
  const [demoId, setDemoId] = useState(DEMOS[0].id);
  const [step, setStep] = useState(0);
  const demo = DEMOS.find((d) => d.id === demoId) ?? DEMOS[0];

  function pick(id: string) {
    setDemoId(id);
    setStep(0);
  }

  return (
    <div data-rise="">
      {/* Which subject. Chips rather than a select: three is few enough to
          show, and seeing all three at once is the point — the range is the
          argument. */}
      <div className="flex flex-wrap items-center gap-2">
        <Slug className="mr-2">Pick a subject</Slug>
        {DEMOS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => pick(d.id)}
            aria-pressed={d.id === demo.id}
            className={cn(
              "press rounded-full border px-4 py-2 font-medium text-[0.9rem] transition-colors duration-200",
              d.id === demo.id
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--stock)]"
                : "border-[var(--rule-strong)] hover:bg-[rgba(12,12,13,0.05)]",
            )}
          >
            {d.subject}
          </button>
        ))}
      </div>

      <div className="panel-live glass-panel mt-6 rounded-[20px] p-5 md:p-7">
        <div className="rule-b flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-[1.02rem]">
              {demo.topic}
            </p>
            <Slug className="mt-0.5 block truncate">From {demo.file}</Slug>
          </div>
          <Slug className="opacity-55">Example</Slug>
        </div>

        {/* The four stages, as a row you can jump around in. Every step is
            reachable at any time — this is a walkthrough, not a form, and
            making somebody click Next three times to see the part they came
            for is how a demo gets abandoned. */}
        <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.label}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "press w-full border-t-2 pt-2 text-left transition-colors duration-200",
                  i === step
                    ? "border-t-[var(--ink)]"
                    : "border-t-[var(--rule)] hover:border-t-[var(--rule-strong)]",
                )}
              >
                <Slug className={i === step ? "opacity-100" : undefined}>
                  {s.slug}
                </Slug>
                <span
                  className={cn(
                    "mt-0.5 block text-[0.92rem] leading-snug",
                    i === step ? "font-semibold" : "opacity-70",
                  )}
                >
                  {s.label}
                </span>
              </button>
            </li>
          ))}
        </ol>

        {/* Keyed on subject *and* step, so switching either replays the
            arrival rather than swapping text in place. `min-h` holds the
            panel steady across steps of different lengths — without it the
            page jumps under the reader every time they press Next. */}
        <div
          key={`${demo.id}-${step}`}
          className="lay-in-soft mt-6 min-h-[15rem]"
        >
          {step === 0 && (
            <div>
              <Slug className="block">What you upload</Slug>
              <p className="mt-3 max-w-[62ch] text-[1.02rem] leading-[1.65]">
                {demo.excerpt}
              </p>
              <p className="mt-5 max-w-[54ch] text-[0.92rem] leading-[1.6] opacity-70">
                Slides, a chapter or your own notes. Nothing is invented from
                outside this file.
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <Slug className="block">
                What the course pulled out — {demo.keyPoints.length} key points
              </Slug>
              <ul className="mt-3">
                {demo.keyPoints.map((kp, i) => (
                  <li
                    key={kp.point}
                    className="rule-t grid grid-cols-[1.6rem_1fr] gap-x-3 py-4"
                  >
                    <Slug className="pt-1">{String(i + 1)}</Slug>
                    <div>
                      <p className="text-[1.02rem] leading-[1.5]">{kp.point}</p>
                      {/* The quote is the whole promise of sources-only mode:
                          every claim can be pointed back at the file. */}
                      <p className="mt-1.5 border-[var(--rule)] border-l-2 pl-3 text-[0.88rem] leading-[1.55] opacity-65">
                        &ldquo;{kp.quote}&rdquo;
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <Slug className="block">Three minutes, out loud</Slug>
                <Slug className="tc">wpm 128</Slug>
              </div>
              <p className="mt-4 max-w-[58ch] text-[clamp(1.05rem,2.2vw,1.35rem)] leading-[1.6]">
                {(() => {
                  let marks = 0;
                  return demo.take.map((run) => {
                    const delay = run[1] === "plain" ? 0 : 220 + marks++ * 260;
                    return (
                      <Mark
                        key={`${run[1]}:${run[0]}`}
                        run={run}
                        shown
                        delay={delay}
                      />
                    );
                  });
                })()}
              </p>
              <p className="mt-5 max-w-[54ch] text-[0.92rem] leading-[1.6] opacity-70">
                Marked while you are still talking, against the key points on
                the previous step — not against the internet.
              </p>
            </div>
          )}

          {step === 3 && (
            <div>
              <Slug className="block">What to do next</Slug>
              <div className="mt-3">
                <div className="rule-t flex flex-col gap-1.5 py-4 sm:flex-row sm:gap-4">
                  <Slug className="shrink-0 text-[var(--miss)] opacity-100 sm:w-[9rem]">
                    Never reached
                  </Slug>
                  <div>
                    <p className="text-[1.02rem] text-[var(--miss)] italic leading-[1.5]">
                      {demo.missed.phrase}
                    </p>
                    <p className="mt-1.5 max-w-[54ch] text-[0.92rem] leading-[1.6] opacity-70">
                      {demo.missed.why}
                    </p>
                  </div>
                </div>
                <div className="rule-t flex flex-col gap-1.5 py-4 sm:flex-row sm:gap-4">
                  <Slug className="shrink-0 text-[var(--vague)] opacity-100 sm:w-[9rem]">
                    Too vague
                  </Slug>
                  <div>
                    <p className="text-[1.02rem] text-[var(--vague)] italic leading-[1.5]">
                      {demo.vague.phrase}
                    </p>
                    <p className="mt-1.5 max-w-[54ch] text-[0.92rem] leading-[1.6] opacity-70">
                      {demo.vague.why}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rule-t mt-2 flex items-center justify-between gap-4 pt-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="press disabled:opacity-30"
          >
            <Slug>&larr; Back</Slug>
          </button>
          <Slug className="tc">
            {step + 1} / {STEPS.length}
          </Slug>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={step === STEPS.length - 1}
            className="press disabled:opacity-30"
          >
            <Slug>Next &rarr;</Slug>
          </button>
        </div>
      </div>
    </div>
  );
}
