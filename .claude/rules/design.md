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
| Display | Source Serif 4, weight 400, never bold |
| Body | Archivo |
| Labels | Martian Mono, uppercase, tracked |

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
- **The mono voice.** Martian Mono, uppercase, small, tracked, for metadata,
  timecodes and labels only.
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
- A colour that is neither a verdict nor the register's single accent. The
  landing's grounds are the one warm ramp at four values — a deep field, two
  tints, and a band on white — and adding a second hue as scenery is how a
  reserved palette stops being reserved. (This line named `#3b37e6`
  ultramarine until the sunset landed; if you find another ultramarine in the
  codebase it is a leftover, not a decision.)
- **A saturated ground under a marked transcript.** Green, red and tan have to
  stay legible and keep meaning *correct*, *missed* and *vague*. Sections that
  mark anything take a light tint; only a section that marks nothing can carry
  the deep field. This is why the colour is not simply alternated down the
  page.
- Cursor-following effects, 3D tilt, magnetic buttons, typewriter headlines.
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
