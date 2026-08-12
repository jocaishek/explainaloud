/**
 * The authored demonstrations, in one place.
 *
 * Two components render these: the step-by-step walkthrough in `try-it.tsx`
 * and the playable console in `demo-console.tsx`. They were about to be two
 * copies of the same three subjects, which is how a landing page ends up
 * marking the same sentence two different ways on one scroll.
 *
 * **Authored, not live.** Nothing here calls a model. `design.md` forbids
 * invented proof on the landing, and a live box would also mean paying per
 * visitor and running an unauthenticated prompt endpoint on a marketing page.
 * Everything below is written the way the grader would actually mark it, and
 * every surface that shows it says so in the corner.
 *
 * **Three subjects, and they are the page's own.** Re-using them rather than
 * inventing more keeps the page one world, and it makes the point the subjects
 * were chosen for: this is not a physics tool.
 *
 * The verdict colours here are verdicts — a claim the grader would pass, one
 * too vague to check, one never reached. That is the only thing they are
 * allowed to be.
 */

export type Verdict = "ok" | "vague";
export type Run = readonly [text: string, verdict: Verdict | "plain"];

/**
 * How a key point came out of the take.
 *
 * `miss` is not in `Verdict` because a run of speech can never be marked
 * missing — you cannot underline something that was not said. It only exists
 * at the key-point level, which is exactly the distinction the product makes.
 */
export type PointVerdict = "ok" | "vague" | "miss";

export type Demo = {
  id: string;
  subject: string;
  topic: string;
  file: string;
  /** A couple of lines of what was uploaded. */
  excerpt: string;
  /** What the course pulled out, each tied to a quote from the file. */
  keyPoints: readonly {
    readonly point: string;
    readonly quote: string;
    readonly verdict: PointVerdict;
  }[];
  /** The spoken take, marked. */
  take: readonly Run[];
  /** The claim that was never reached, and what to do about it. */
  missed: { readonly phrase: string; readonly why: string };
  /** The vague claim, and what would have made it checkable. */
  vague: { readonly phrase: string; readonly why: string };
};

export const DEMOS: readonly Demo[] = [
  {
    id: "physics",
    subject: "Physics",
    topic: "Newton's third law",
    file: "forces-notes.pdf",
    excerpt:
      "For every action there is an equal and opposite reaction. The two forces are equal in magnitude and opposite in direction, and, crucially, they act on different bodies, which is why they never cancel.",
    keyPoints: [
      {
        point: "Forces occur in pairs",
        quote: "For every action there is an equal and opposite reaction.",
        verdict: "ok",
      },
      {
        point: "The pair is equal in size, opposite in direction",
        quote: "equal in magnitude and opposite in direction",
        verdict: "vague",
      },
      {
        point: "The two forces act on different bodies",
        quote: "they act on different bodies, which is why they never cancel",
        verdict: "miss",
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
        verdict: "ok",
      },
      {
        point: "Both become ions with opposite charges",
        quote: "Both become ions carrying opposite charges",
        verdict: "ok",
      },
      {
        point: "Electrostatic attraction holds the lattice together",
        quote:
          "it is the electrostatic attraction between those charges that holds the lattice together",
        verdict: "miss",
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
      "The Stamp Act of 1765 taxed printed paper in the colonies: newspapers, pamphlets and legal documents. It was the first direct tax Parliament had levied on the colonies, and the objection was constitutional rather than financial: taxation without representation.",
    keyPoints: [
      {
        point: "It taxed printed paper in the colonies",
        quote:
          "taxed printed paper in the colonies: newspapers, pamphlets and legal documents",
        verdict: "ok",
      },
      {
        point: "The objection was constitutional, not financial",
        quote:
          "the objection was constitutional rather than financial: taxation without representation",
        verdict: "vague",
      },
      {
        point: "It was the first direct tax on the colonies",
        quote: "the first direct tax Parliament had levied on the colonies",
        verdict: "miss",
      },
    ],
    take: [
      ["The Stamp Act taxed ", "plain"],
      ["printed paper, newspapers, legal documents", "ok"],
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
      why: "Your source says the opposite. The objection was constitutional. A claim that contradicts the material cannot be marked correct.",
    },
  },
];
