# Design

Four people independently described this site as looking AI-generated. They
were right, and the reasons are specific and fixable. This file is
prescriptive on purpose: "never use a glow orb" is enforceable, "use beautiful
typography" is not.

## The references

Ten sites and app screens were chosen as the target: Discience (Study App),
Audemars Piguet, Guillaume Tomasi, Impossible Bureau, Magic Spoon, mymind,
Apotheke zur Triumphpforte, The Roots, AR—CO, and a NASA projects page.

They differ wildly in mood. What they share is what matters:

- **Flat colour and hard edges.** Not one has a glow, a blurred radial
  gradient, or a frosted-glass panel.
- **Type is the design.** Display type is enormous, tightly tracked, and the
  jump from heading to body is 3x or more, not 1.5x.
- **Editorial structure.** Rules, numbers, sidebars, asymmetric grids,
  deliberate white space. Not a centred column of rounded cards.
- **A committed canvas.** Paper white, or true black, or one saturated flat
  colour. Never near-black with a coloured halo.
- **Real content.** Photography, illustration, or generative art. Never a
  gradient standing in for an image.
- **Restraint in motion.** One considered page-load reveal beats a dozen
  scattered micro-interactions.

## A second, much wider set

Eleken's fifty-site roundup was read against the ten. It is worth being honest
about what it says, because roughly half of those fifty are dark UIs with neon
gradients, glowing CTAs, blurred-glass cards and 3D washes — the exact list
banned below.

That is not a contradiction, and the resolution is the whole point:

- **They commit.** Rebellion is an orange field with all-caps sans and nothing
  else. Kovalska is red, black and white. Overrrides is a black terminal with
  pixel type. Each picks one extreme and goes all the way. The failure mode
  here is not "dark and glowing", it is a thin decorative layer of glow and
  glass applied over a layout that would be a generic centred column without
  it.
- **There is craft underneath.** The neon sites earn it with custom typefaces,
  real 3D, commissioned illustration, cinematic photography. A gradient is the
  finish on something, never the thing itself. We have none of that, so we do
  not get to use the finish.
- **Everything memorable has one signature device** carried through the whole
  site: Hydra's duck, GRIDS' grid, Abetka's letter cards, Stripe Press's
  floating books. Not a different effect per section.
- **Serif display against sans body recurs constantly** — MORAL, SEBTO,
  Gemnote, Ellipsus, Art+Tech Report, Arrow Dynamics. It is the single most
  reliable way to look designed rather than defaulted.
- **Colour is identity, not accent.** The palette is stated in the first
  screen and never apologised for.
- **The first three seconds decide.** One idea, at size, above the fold.

So the rules below stand. They are not an argument that restraint is the only
good aesthetic; they are what is available to a site whose content is text.

## Banned

These are the tells. Every one of them is currently in `src/app/page.tsx`.

- `GlowOrb`, or any blurred radial gradient used as a background
- `.glass`, frosted panels, `backdrop-filter` as decoration
- `Spotlight` (cursor-following radial wash)
- `TiltCard` (3D tilt on hover)
- `Magnetic` (buttons that chase the cursor)
- `WordReveal`'s per-word blur-in on headlines
- `ScrollSquiggle`, and decorative scroll-drawn paths generally
- Typewriter effects in a headline
- Numbered mono eyebrows (`01 —— WHAT YOU GET`) on every section
- Glowing box-shadows in the brand colour under buttons
- A centred column of equal rounded cards as the default layout

Deleting a component is better than keeping it unused. Git remembers.

## Type

The current stack is Poppins with Instrument Serif and Geist Mono. Poppins is
a geometric sans on the same shortlist as Inter and Roboto, and it is half the
reason the page reads as generated.

- **Never** Inter, Roboto, Open Sans, Lato, Poppins, Montserrat, or a system
  stack, for display.
- Pick a display face with a point of view and a body face that disappears.
  Weight extremes, 200 against 800, not 400 against 600.
- Size jumps of 3x or more between levels.
- Set headlines tight: negative tracking at display sizes.

## Colour

One dominant colour, one sharp accent, and nothing else. The brand is a
three-stop ramp of a single hue in `globals.css`; read the tokens, never
write a hex into a component.

Green, red and amber are reserved. They mean *correct*, *missing* and *vague*
inside a transcript, and the brand must stay clear of all three.

## Layout

The marketing page is currently pinned to dark because the glass-and-glow
treatment only worked on a dark canvas. Once that treatment is gone, that
constraint goes with it, and a paper-light landing page is the single most
effective way to stop looking like every other AI-generated site.

## Working method

1. **Always work from a reference image.** Pasting a visual produces
   visual-shaped output; describing one in words produces text-shaped output.
2. **Screenshot and compare.** Build, screenshot, list the specific deltas
   against the reference (type scale, colour, spacing, structure), then fix
   those. Two passes is usually right; past three there are diminishing
   returns and it is better to restart with a sharper prompt.
3. **Reject vague language.** "Modern" and "clean" carry no information.
   "Editorial layout, serif display, asymmetric grid" does.
