---
name: Explainaloud
description: A night-desk study interface that grades a spoken explanation under one cobalt lamp.
colors:
  night-ground: "#0a0f1e"
  night-ground-high: "#122540"
  paper: "#0f1730"
  study-ink: "#eef2fb"
  study-muted: "#97a3bd"
  hairline: "rgba(214, 226, 252, 0.13)"
  cobalt: "#1d3a63"
  cobalt-deep: "#16253d"
  cobalt-text: "#9cc8f2"
  cobalt-wash: "rgba(43, 92, 143, 0.42)"
  cobalt-contrast: "#f8faff"
  landed: "#6fd39e"
  vague: "#eec46a"
  vague-soft: "rgba(238, 196, 106, 0.22)"
  missing: "#f0949e"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.7rem, 1.9rem + 4vw, 5.3rem)"
    fontWeight: 780
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.05rem, 1vw + 0.85rem, 1.2rem)"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 650
  metadata:
    fontFamily: "Martian Mono, monospace"
    fontSize: "0.72rem"
    fontWeight: 400
rounded:
  control: "12px"
  surface: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.cobalt-contrast}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 22px"
    height: "52px"
  transcript-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.study-ink}"
    rounded: "{rounded.surface}"
    padding: "22px"
---

# Design System: Explainaloud

## Overview

**Creative North Star: "The Night Desk"**

Explainaloud's landing surface is the desk the night before the exam: a deep
ink-navy room, one cobalt lamp, and the learner's own words being graded in
the pool of light. The page is committed dark — it does not follow the theme
toggle, because the composition is the identity. Everything warm or loud is
removed; persuasion is carried by a live graded transcript sitting in the
light.

**Key Characteristics:**

- Deep ink-navy ground, nearly empty; the one abstract material is the
  vapor slab, a looping kaleidoscope video hue-shifted into the brand steel,
  living inside the words "explain it."
- One blue everywhere: the brand tile, the primary buttons, the headline
  highlight, the waveform and the source-boundary field are all the app's own
  deep navy `#1d3a63` (with `#9cc8f2` as its lit text tint, `#2b5c8f` as the
  mid stop behind washes and glows)
- A full-viewport minimal hero: badge pill, 700-weight promise with the
  vapor slab phrase, one line of body, one steel pill action
- Verdict green, amber and red appear only where a learner's words are graded
- Motion is one authored entrance (GSAP, expo ease-out) plus quiet one-time
  reveals; everything respects reduced motion

## Colors

### Primary

- **Study Navy `#1d3a63`:** the sole brand and action color — buttons, the
  brand tile, the stage glow, the boundary field.
- **Cobalt Text `#9cc8f2`:** the same hue lifted for words and small accents
  that must stay legible on the dark ground.
- **Cobalt Wash `rgba(43,92,143,.42)`:** the headline highlight and code
  chips.

### Neutral

- **Night Ground `#0a0f1e`** with **`#122540`** as the high point of the
  ambient radial at the top of the page.
- **Paper `#0f1730`:** every card surface.
- **Hairline `rgba(214,226,252,.13)`:** all rules and borders.
- **Study Ink `#eef2fb`** and **Study Muted `#97a3bd`** for text.

### Named Rules

**The Reserved Verdict Rule.** Landed green, vague amber, and missing red
appear only where the interface evaluates a learner's words. On this ground
they run one stop lighter (`#6fd39e`, `#eec46a`, `#f0949e`).

**The One Lamp Rule.** The stage glow is the only decorative light source on
the page. No second glow, no floating orbs, no gradient scenery elsewhere.

## Typography

One family, Geist, across display and body; hierarchy is scale, weight and
tracking, never a change of voice. Display sits at 780 with -0.035em
tracking. Martian Mono is reserved for timecodes and file metadata, always
small, never for headings or labels.

## Layout

The hero fills the first viewport and stays mostly empty: partnership badge
pill, the two-line promise with "explain it." on the vapor slab, one line of
body, the steel pill with a quiet text link, and the privacy note, centered
in the dark.

After the fold: a marquee of the loop's five phrases between hairlines; the
showcase, a mac-chromed product window standing on the sunlit desk photo in
a 20px panel; two tilted subject cards; the verdict chapter, three cards
washed in the reserved colors; How it works as three columns under hollow
7rem numerals; the steel source-boundary field; and the close, ending in the
wordmark at up to 12rem fading into the page's bottom edge.

## Elevation & Depth

Shadows are near-black with wide blur and real offset
(`0 40px 90px rgba(2,6,18,.75)` on the proof; `0 24px 60px rgba(2,6,18,.6)`
on the wings), plus a 1px inner hairline on the proof card. The glow provides
separation; borders stay at the hairline token.

**The One Focal Stack Rule.** Strong elevation belongs to the live demo.
Everything else is flat paper with hairlines.

## Motion

- The entrance: SplitText masked words rise, the slab scales in on
  back.out, badge and pill pop.
- Scroll choreography, all scrubbed and transform-only: the hero copy hands
  off as you leave it; the nav hides scrolling down and returns scrolling
  up; the marquee belt speeds with scroll velocity; the product window
  stands up out of the desk in perspective while the photo settles; subject
  cards swing in from their own sides; verdict cards deal out on back.out;
  the hollow numerals drift slower than their steps; the boundary statement
  lands word by word; the giant wordmark rises out of the page's bottom
  edge.
- The vapor plays at 0.25x and holds its first frame under reduced motion;
  every GSAP behavior sits behind the same reduced-motion gate.
- The equalizer bars loop in CSS (`scaleY`, alternating), and stop entirely
  under `prefers-reduced-motion`; GSAP work is gated behind
  `gsap.matchMedia("(prefers-reduced-motion: no-preference)")` with all
  content visible by default.

## Do's and Don'ts

### Do:

- **Do** open with the graded transcript in the light; it is the argument.
- **Do** keep the primary action visible before the first scroll.
- **Do** keep every border on the hairline token and every card on paper.

### Don't:

- **Don't** add a second light source, gradient text, or glassmorphism.
- **Don't** use verdict green, amber, or red as decoration.
- **Don't** add invented metrics, testimonials, customer logos, or press.
- **Don't** let the page follow the app theme toggle; the dark is committed.
