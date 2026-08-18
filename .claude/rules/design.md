# Design

**One register.** The landing page and the signed-in app are the same world:
same stock, same ink, same sunset accent, same shapes, same type. This file
previously described two — a serif monument on paper and a calm blue tool —
and that split is retired. It was a defensible call and it produced a visible
seam at sign-in; the decision now is that a person should not be able to tell
they have crossed one.

| | Both sides |
|---|---|
| Canvas | `#f2f2f0` warm stock, cards in white |
| Accent | Amber `#f59e0b` over `#b45309`, `#fbbf24` for the lit edge and glow. Dark ink on the fill, never white |
| Panels | Frosted glass over a warm field, or a ruled card |
| Elevation | Tinted with `rgba(124, 45, 18, …)`, never neutral |
| Display | Geist, weight 600, tracking -0.035em |
| Body | Geist |
| Labels | Body face, sentence case. Martian Mono only for metadata and timecodes |

`.register-app` still exists, and still exists for a reason: the app needs its
own radii, its own spacing rhythm and its own denser type scale, because a
screen somebody sits inside for twenty minutes is not a screen they read for
three seconds. What it no longer does is answer a different question about
*colour* or *typeface*. It re-points shape and density, and nothing else.

## How the two registers are built

`src/app/globals.css`. `:root` holds the answers; `.register-app` re-points the
shape-and-density subset for the app. **Neither side may hardcode a value the
other owns** — that indirection is what let the whole product change accent
twice in one afternoon by editing four lines.

The important consequence: `--elev-rest` is `none` outside the app, and
`--r-card` is `0px`. A shared component written as `rounded-card border
border-border shadow-rest` is therefore correct in *both* registers without
knowing which one it is rendering in — flat and ruled on the landing, raised and
soft in the app. That is why there is one `Card`, one `Button` and one `Input`
rather than two sets, and why a `className` override at a call site deciding the
register is always a bug.

The landing's own artifact panels set `rounded-[20px]` directly, and that is the
one sanctioned exception: they are a bespoke composition on a single page rather
than instances of the shared card. It stays an exception. The moment a second
page needs that panel, it becomes a component and reads the token.

`--brand`, `--brand-deep` and `--brand-ink` are indirections for the same
reason. They name what a colour is *for*, so the files across the app can keep
asking for `bg-brand-deep` and get the right answer on either side.

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

  Declared at `:root`, restated inside `main.lp-v2` because that block forces
  light surfaces whatever the reader's theme, and lifted one stop in `.dark`
  because a mid-weight orange that is vivid on paper is a brown smudge on
  carbon. A component asks for the token and is right in all three.

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

- **Floating blurred orbs.** A soft radial shape sitting over a layout as
  decoration — removed twice, still banned. This is *not* the same as a section
  ground: `.ground-deep` and the two tints are full-bleed fields that define a
  region and carry its type, which is what the reference set does and what
  makes a long page read as chapters. The test is whether removing it changes
  the section's identity or just removes a smudge.
- Glassmorphism and `backdrop-filter` as decoration. Blur is for a bar floating
  over scrolling content, and nothing else.
- A colour that is neither a verdict, the streak flame, nor the register's
  single accent. The flame is the one addition this list has taken, it was
  taken deliberately, and it did not open a door: adding a fifth means making
  the same case, which is that the thing being coloured means exactly one
  thing, means it everywhere, and is confusable with none of the four. The
  landing's grounds are the one warm ramp at four values — a deep field, two
  tints, and a band on white — and adding a second hue as scenery is how a
  reserved palette stops being reserved. (This line named `#3b37e6`
  ultramarine until the sunset landed; if you find another ultramarine in the
  codebase it is a leftover, not a decision.)
- **A saturated ground under a marked transcript.** Green, red and tan have to
  stay legible and keep meaning *correct*, *missed* and *vague*. Every section
  that marks anything takes a light ground, and `#f2ede6` is the floor for the
  bare stock: it is the deepest warm value on which all three verdicts still
  clear 4.5:1. One step below it the tan fails.

  **Count the ground field, not just the stock.** A wash is laid *over* the
  stock, so the number that matters is the blend at its heaviest point, not
  the hex in `background-color`. `.ground-warm` carries a strong sunset rake
  and lands the tan near 3.9:1 where the light is brightest — fine, because
  section 02 marks nothing, and disqualifying for any section that does. A
  section that marks takes a light stock *and* a light field.
- **More than one inversion on a page.** Light to dark and back is a full eye
  adaptation, and a reader who does it twice in six sections reports the page
  as flashing at them — which is exactly what happened. A page gets at most one
  crossing, and it goes where the meaning is: the landing's close, because
  going dark there says *this is the end*. The dashboard gets none at all; the
  top of a tool somebody opens ten times a day is not a different region, it is
  the top of the page.

  The corollary is that chapters have to come from the light range instead, so
  spend it. Three "different" sections at `#ffffff`, `#f6f3f1` and `#ffffff` is
  a two per cent step, which is no step at all — that flatness is what made the
  two dark bands read as flashes rather than as structure.
- **The machine describing itself to the person using it.** Pipeline diagrams,
  role names, model names, agent counts. It is all true and none of it is
  something a person revising for a test can act on, and a page that leads with
  how it was assembled reads as a demonstration of the assembly. Keep the trace
  — somebody who wants to know how a claim was checked should be able to find
  out — behind one click, named in words rather than in the vocabulary of the
  system that produced it.
- 3D tilt, magnetic buttons, typewriter headlines.
- Cursor-following effects **as decoration**: a halo, a trailing dot, a
  particle spawner, anything that draws a shape where the pointer is. The
  landing's hero field is the one sanctioned exception and it is not that: the
  pointer lays a short, ageing wake into a fluid that is already flowing, so
  there is no shape attached to the cursor, nothing is drawn on top of the
  page, and standing still returns the field to its own motion within about a
  second and a half. The test is whether the effect exists when the pointer
  does not. A halo does not; this does.
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
weight plus the accent colour, which is also the only pairing that survives
greyscale.

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
