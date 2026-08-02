# Design

The product has **two visual registers**. This is a deliberate decision, not
drift, and the reason it is written down first is that every other rule here
depends on knowing which side of the sign-in you are on.

| | Landing (`src/app/page.tsx`) | App (`src/app/(app)/**`) |
|---|---|---|
| Canvas | `#161616` hero into `#f8f8f8` sections | `#fafafb` |
| Cards | 0px radius, hairline, **no shadow** | 20px radius, soft shadow, lift on hover |
| Accent | Ember `#ff6436` | Blue `#4f7cff` |
| Density | Compact, 6px base unit | Generous, everything breathes |
| Display | Super-condensed, 200px+, gradient fill | Inter, large and bold |

The landing page is a monument: it has three seconds to be memorable and its
only content is type. The app is a tool somebody uses for twenty minutes at a
time, where legibility and calm beat impact. Those are genuinely different
jobs and one system serving both serves neither well.

**The accepted risk:** the sign-in is a visible seam. Somebody arriving from
the landing page meets a different-looking product. That is the trade for
having each side be good at its own job, and it was taken knowingly. What
keeps it from reading as two products is the next rule.

## What crosses the seam unchanged

Three things are identical on both sides, and they are what make it one
product rather than two:

- **The three verdict colours.** `--ok` green, `--miss` red, `--vague` tan.
  Correct, missing a step, said but not checkably. Nothing else may use them,
  anywhere, so the green somebody is shown before signing up is the green they
  are graded in afterwards.
- **The motion system.** `--ease-enter`, `--ease-exit`, and the three
  durations. Same weight, same settle, both sides.
- **The mono voice.** Uppercase, small, tracked, for metadata and labels only.

## Banned, both registers

- Blurred radial gradients as backgrounds. This has now been removed twice.
- Glassmorphism and `backdrop-filter` as decoration. Blur is for a floating
  nav over content, and nothing else.
- A colour that is not a verdict and not the register's single accent.
- Cursor-following effects, 3D tilt, magnetic buttons, typewriter headlines.
- A centred column of equal rounded cards as the default layout.
- Spring or overshoot easing. The curves are in the tokens; use them.

## Type

**App:** Inter. This supersedes the previous ban on Inter for display, which
was written when the app had no type system at all and Inter was the symptom
rather than the disease. With a real weight and size scale under it, Inter is
the correct choice for a working interface.

**Landing:** a super-condensed display face for monument statements only,
never below 23px, against a grotesque body. The display face carries the
black-to-light gradient fill; body type never does.

## Imagery

Product output first: the marked transcript, the pace chart, the take panel.
These are real, they are what the product makes, and they are the strongest
thing available. Abstract generated forms may sit behind sections as texture.

Never photography of people, never stock, and never a gradient standing in for
an image.

**No invented proof.** No usage numbers, no testimonials, no customer names,
no press. See PRODUCT.md. Demonstration material is authored and is marked
exactly as the grader would mark it.

## Working method

1. Work from a reference image. Describing one in words produces text-shaped
   output.
2. Build, screenshot, list the specific deltas, fix those. Two passes is
   usually right.
3. Tokens, never literals. A component that hardcodes a hex or a radius is how
   two things solving the same problem end up looking different.
