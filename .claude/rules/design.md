# Design

**One register.** The landing page, the auth screens and the signed-in app are
the same world: the same paper, the same ink, the same shapes and the same
type. A person should not be able to tell they have crossed the sign-in.

| | Everywhere |
|---|---|
| Canvas | `#f8f9fa` paper, cards in white |
| Accent | None. Ink `#141517` is the action colour: the primary button, the selection, today's bar. White type on it |
| Panels | A white card with a hairline border (ink at 8%) and a small, soft, neutral shadow (`--elev-rest`) |
| Radii | Controls 10 (`--r-control`), cards 16 (`--r-card`), round (`--r-pill`) |
| Display | Geist, weight 400, tracking -0.035em |
| Body | Geist |
| Labels | Body face, sentence case. Martian Mono only for metadata, timecodes and URLs |
| Motion | One curve, `cubic-bezier(0.22, 1, 0.36, 1)`. One entrance per page |

Colour is kept for the things that mean something — the three verdicts and the
streak flame — so the chrome stays quiet and the marked transcript, the topic
progress and the streak are what a person sees first.

This is the result of the October 2026 redesign, worked out in mockups first
(see the PR that introduced it) and then run through the `unslop` checklist:
4px spacing grid, three text roles, one icon set (lucide, 16px, 1.5 stroke), no
glows, gradients or washes, no greeting headlines, no trailing periods on short
labels.

## How the register is built

`src/app/globals.css`. `:root` holds every answer and `.dark` holds the night
ones. `.register-app` (on the app shell) re-points the app's spacing rhythm and
nothing else — a screen somebody sits inside for twenty minutes needs its own
density, not its own palette. **Components read tokens, never literals**: that
indirection is what lets the product change its look by editing one block.

`--brand`, `--brand-deep` and `--brand-ink` still exist as indirections because
files across the app ask for `bg-brand-deep` or `text-brand-ink`, and those
names say what the colour is for. They answer with the ink now.

## What crosses the seam unchanged

Three things are identical in both registers, and they are what make this one
product:

- **The three verdict colours.** `--ok` green, `--miss` red, `--vague` tan.
  Correct, missing a step, said but not checkably. Nothing else may use them,
  anywhere — so the green somebody is shown before signing up is the green they
  are graded in afterwards. They are declared once, at `:root`, and deliberately
  do not appear in `.register-app`.
- **The streak flame.** `--flame` orange, with `--flame-core` for the hot
  inside and `--flame-glow` for the arrival. It is the fourth reserved colour
  and the only one that is not a verdict, and it is reserved on exactly the
  same terms: it means one thing, it means it on both sides of the sign-in, and
  **nothing but the streak may use it.**

  It is a red-orange rather than a gold on purpose. `--vague` is the amber a
  grader paints on a claim that was said but not checkably, and a flame close
  enough to be confused with it would put a celebration and a judgement in the
  same colour in the same view. Different hue family, legible at a glance.

  Declared at `:root` and lifted one stop in `.dark`, because a mid-weight
  orange that is vivid on paper is a brown smudge on carbon. A component asks
  for the token and is right in both themes.

- **The mono voice.** Martian Mono, uppercase, small, tracked — for **metadata
  and timecodes**, and nothing else.

  It used to say "and labels", and that word did the damage. A section heading
  is a label by any reasonable reading, so `NOTES`, `CITED`, `TOPICS` and
  `AGENT ORCHESTRATION` were all set in tracked capitals, and a study page ended
  up shouting five machine-voiced words at somebody before they reached a
  sentence. Compared side by side with the tools people actually use for this —
  a notebook app, a classroom app — the difference was not colour or layout. It
  was that those name their regions in plain sentence case, in the body face, at
  a readable size, and this one announced them.

  So: a timecode, a word count, a date, a provider name — mono. A word that
  names a region of the page a person is reading — body face, sentence case.
  When in doubt it is not mono; the voice is reserved precisely because it is
  used rarely.
- **The mark and the wordmark.** Same size, same tracking, both mastheads.

## Banned, both registers

- **Floating blurred orbs, colour washes and glows.** A soft coloured shape
  sitting over a layout as decoration — removed three times, still banned. The
  last one was a lavender-to-ice inner glow on the landing's panels; it went in
  the October 2026 pass for the same reason as the others.
- Glassmorphism and `backdrop-filter` as decoration. Blur is for a bar floating
  over scrolling content, and nothing else.
- A colour that is neither a verdict, the streak flame, nor the ink. The flame
  is the one addition this list has taken, it was taken deliberately, and it
  did not open a door: adding another means making the same case, which is that
  the thing being coloured means exactly one thing, means it everywhere, and is
  confusable with none of the four. (The product has been amber, navy and
  ultramarine before; if you find one of those in the codebase it is a
  leftover, not a decision.)
- **A saturated ground under a marked transcript.** Green, red and tan have to
  stay legible and keep meaning *correct*, *missed* and *vague*. Every section
  that marks anything sits on the paper or on a white card, where all three
  clear 4.5:1.
- **More than one inversion on a page.** Light to dark and back is a full eye
  adaptation, and a reader who does it twice in six sections reports the page
  as flashing at them — which is exactly what happened. Today no page has one:
  the landing is light from top to bottom, and its sections are separated by
  space and by white cards on the paper rather than by bands of colour.
- **The machine describing itself to the person using it.** Pipeline diagrams,
  role names, model names, agent counts. It is all true and none of it is
  something a person revising for a test can act on, and a page that leads with
  how it was assembled reads as a demonstration of the assembly. Keep the trace
  — somebody who wants to know how a claim was checked should be able to find
  out — behind one click, named in words rather than in the vocabulary of the
  system that produced it.
- 3D tilt, magnetic buttons, typewriter headlines.
- Cursor-following effects **as decoration**: a halo, a trailing dot, a
  particle spawner, anything that draws a shape where the pointer is. (The
  landing's demo film draws a cursor, and it is not that: it is part of a
  recorded product walkthrough, not attached to the reader's pointer.)
- Pure-black shadows. Elevation is tinted with the text hue or it reads as dirt.
- Spring or overshoot easing.
- A hex or a pixel radius written into a component. Tokens, always.

## Banned on the landing only

- A centred column of equal rounded cards as the layout. The landing's panels
  are real product output — a marked clause, a claim never reached — not a
  feature grid wearing a card.
- Photography of people, stock imagery, or a gradient standing in for an image.
- **No invented proof.** No usage numbers, no testimonials, no customer names,
  no press. See PRODUCT.md. Demonstration material is authored, and is marked
  exactly as the grader would mark it.

## On the type system

There is one family on both sides of sign-in, and hierarchy is carried by
size, weight and tracking rather than by a change of voice.

Two display faces were tried in front of this and both were rejected, for
reasons worth keeping because they are opposite and both correct:

- **Source Serif 4** read as machine made. A serif display over a grotesque
  body is genuinely the most reliable way to make a text-only page look
  composed, which is exactly why it is now the house style of every generated
  landing page. The move had stopped being a decision.
- **Bricolage Grotesque** read as goofy. The thing that made it distinctive
  was its irregularity, and irregularity is charm rather than authority. This
  is a study tool: somebody opens it before an exam or the night before a
  talk, and charm is the wrong register for that moment.

What is left is Geist, set across display and body. A single family type
system reads as serious because nothing in it is performing, and that is the
correct answer for this product. It requires the display block in
`globals.css` to actually do its job: if display copy is only body copy at a
larger size, the page looks unset.

**There is no italic.** Geist ships none, and a synthetic slant at display
size shears the word and reads as a rendering fault. Emphasis in headlines is
weight and, where something is being marked, the verdict colour of what it
was marked as.

## On Inter

The previous version of this file banned Inter outright. That ban is retired,
and the distinction matters: it was written when the app had no type system at
all, so Inter was the *symptom* of everything being default rather than the
cause. With a real weight and size scale under it, a neutral grotesque is the
correct choice for a working interface.

It stays banned for **display** — the landing page never sets a word in it.

A rules file that contradicts the code is worse than no rules file, because the
next person to read it undoes working work.

## Working method

1. Work from a reference image. Describing one in words produces text-shaped
   output.
2. Build, screenshot, list the specific deltas, fix those. Two passes is usually
   right.
3. Reject vague language. "Modern" and "clean" carry no information; "serif
   display, ruled columns, no card edges" does.
