# Design

The product has **two visual registers**, and knowing which one you are in is
the first thing to establish before touching anything. It is a deliberate
decision rather than drift, and every other rule here depends on it.

| | Landing (`src/app/page.tsx`) | App (`.register-app`) |
|---|---|---|
| Canvas | `#fbfbfb` photocopy stock | `#fafafb`, cards in white |
| Panels | Hairline, **no shadow**, ruled against the stock | 20px radius, soft tinted shadow |
| Accent | Ink. Colour only where it means something | Blue `#4f7cff` |
| Display | Source Serif 4, weight 400, never bold | Inter, 600, size does the rest |
| Body | Archivo | Inter |
| Rhythm | Compact, ruled | `--stack`, everything breathes |

The landing page is a monument. It has three seconds to be memorable, its only
content is type, and a serif headline reads as a sentence somebody wrote rather
than as an announcement — which is the right voice for a page arguing that you
should explain things aloud.

The app is a tool somebody sits inside for twenty minutes, where legibility and
calm beat impact. A neutral grotesque at 13px for twenty minutes is a feature.
Those are genuinely different jobs and one system serving both serves neither.

**The accepted risk:** the sign-in is a visible seam. Somebody arriving from the
landing page meets a different-looking product. That was taken knowingly, and
two things keep it from reading as two products — the next section, and the fact
that the sign-in screen itself is in the *app* register, so the change happens
one screen before anybody is asked for a password.

## How the two registers are built

`src/app/globals.css`. `:root` holds the landing's answers; `.register-app`
re-points the same tokens at the app's. One class on the app shell switches the
whole product over, and **neither side may hardcode the other's values**.

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

- Blurred radial gradients as backgrounds. This has now been removed twice.
- Glassmorphism and `backdrop-filter` as decoration. Blur is for a bar floating
  over scrolling content, and nothing else.
- A colour that is neither a verdict nor the register's single accent.
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
