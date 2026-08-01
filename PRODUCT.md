# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone trying to learn something, deliberately not a segment. The confirmed
audience is general: a student before an exam, a professional working through
unfamiliar material, a self-taught learner with no cohort and nobody to
explain the subject to. What they share is the situation, not the demographic:
they have material in front of them, they have read it, and they cannot tell
whether they actually understand it.

The job is to find out, before the moment that tests them for real.

## Product Purpose

Rereading notes feels like learning. Explaining the topic out loud is where
you find out whether it was.

Someone uploads their material, talks through the topic for about three
minutes, and gets their own words back marked sentence by sentence: what they
had right, what was vague, and the steps they skipped without noticing.
Nothing is typed. No audio is kept.

Success is the person discovering a gap they did not know they had, and
knowing what to do about it.

## Positioning

Flashcards, quizzes and re-reading all test recognition. This grades
production: unscripted spoken explanation, checked claim by claim against
a course built from the person's own uploaded material.

Two mechanisms a neighbouring product could not truthfully copy:

- **Live colouring while you speak.** Words are marked green, red or grey as
  they are said, not after a verdict at the end. The person watches their own
  explanation being graded in real time.
- **Pace against your own baseline.** Articulation rate, measured against a
  baseline recorded during onboarding, so thinking pauses are not counted
  against you. This is not gross words-per-minute.

## Operating Context

The material is real course material: PDF, Word, Markdown, HTML, CSV, LaTeX
or plain text, up to 5 MB a file. Lecture slides, textbook chapters, notes.

Using it is speaking out loud, so it happens somewhere the person can talk:
a desk, a bedroom, a library carrel with headphones. Sessions are short,
around three minutes, and repeated.

## Capabilities and Constraints

Confirmed and implemented:

- Course generation from uploaded material by a chain of agents that
  researches, drafts, independently audits and revises, with every claim tied
  to an exact quote from the source.
- **Sources-only mode**: use nothing beyond these files. The course is allowed
  to come back short, and gaps in the material are named rather than quietly
  filled from elsewhere.
- Claim-by-claim grading of spoken explanation, with half credit for a
  compound point half-covered.
- Live colouring during speech: green correct, red missing step, grey no
  checkable claim.
- Pace measured as articulation rate against the person's own baseline.
- Interview mode: one question at a time from a per-course bank, never
  repeating, each question written out of what the last answer missed.
- A gap report that lands every topic as review, practice, or mastered.

Constraints: Next.js App Router, React 19, TypeScript, Tailwind v4, Biome,
Supabase with row-level security. Speech is transcribed, never stored.

## Brand Commitments

- The name **Explainaloud** and the existing logo mark stay.
- **Green, red and amber are reserved.** Inside a transcript they mean
  correct, missing and vague. The brand colour must stay clear of all three.
- **The brand colour is open and should change.** The current rust reads as
  Anthropic's palette, which is a confirmed problem, not a preference.
- Voice: plain, specific, no hype. Sentences that name what happens.

## Evidence on Hand

The product itself, live, is the only proof this page may use. A real
transcript being coloured as it is spoken is the demonstration.

**There are no usage numbers, no testimonials, no customer names, and no press.
None may be invented or implied.** A page that needs social proof to work has
the wrong structure.

## Product Principles

1. **Demonstrate, never assert.** The mechanism shown beats any adjective
   describing it.
2. **Coming back short is a correct answer.** In sources-only mode, naming
   what the material does not cover is the feature.
3. **Grade production, not recognition.** Speaking is the input, always.
4. **Measure against the person, not a population.** Pace is relative to their
   own baseline.
5. **Keep nothing.** Audio is transcribed and discarded; that is a promise the
   page can make plainly.
