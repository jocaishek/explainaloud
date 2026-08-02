"use client";

import { useEffect, useRef } from "react";
import { useMediaQuery } from "~/hooks/use-media-query";

/**
 * The landing page's level meter, driven by the actual microphone.
 *
 * The hero panel shows twelve bars moving while a take arrives, and until now
 * the signed-in recording screen — the one place where something is genuinely
 * being heard — showed nothing at all. Same twelve bars, same geometry, same
 * accent: the demo and the product are one surface.
 *
 * The difference is what moves them. On the landing page they run a CSS
 * keyframe, because there is no microphone and a meter is the only honest
 * thing a page can draw for a recording that is not happening. Here there is a
 * real `AnalyserNode` already open for the silence watchdog, so the bars show
 * the room. That matters beyond decoration: someone whose microphone is muted
 * or pointed at the wrong input now sees flat bars immediately, rather than
 * finding out from the silence warning ten seconds later.
 *
 * Heights are written straight onto the elements from a `requestAnimationFrame`
 * loop. Sixty state updates a second through React, on a screen that is also
 * transcribing and grading, is the kind of thing that makes a recording drop
 * chunks.
 */

/** Bars, matching the hero panel exactly. */
const BAR_COUNT = 12;

/**
 * How fast a bar rises and falls, per frame.
 *
 * Rise is nearly immediate because a meter that lags the voice reads as
 * broken; fall is slow enough to leave a trace of the last syllable, which is
 * what makes the row look like speech rather than like noise.
 */
const ATTACK = 0.5;
const RELEASE = 0.12;

/** Below this, a bar sits at its floor rather than twitching on room tone. */
const NOISE_FLOOR = 0.04;

export function LevelMeter({
  analyserRef,
  /** False once the take has stopped: the bars settle and stay settled. */
  active,
}: {
  analyserRef: React.RefObject<AnalyserNode | null>;
  active: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  /* A meter is movement by definition, and this one moves continuously for
   * three minutes at the edge of vision. Held still under the setting; the
   * silence watchdog still catches a dead microphone in words. */
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const bars = Array.from(row.children) as HTMLElement[];
    const heights = new Array<number>(bars.length).fill(0);

    if (!active) {
      for (const bar of bars) bar.style.transform = "scaleY(0.08)";
      return;
    }

    let frame = 0;
    let last = 0;
    let spectrum: Uint8Array<ArrayBuffer> | null = null;

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      /* Under `prefers-reduced-motion` the meter slows down; it does not stop.
       *
       * It used to stop, and that was a misreading of the setting. This row is
       * not an animation, it is the only thing on the screen that says the
       * microphone is working — held at its floor it looks exactly like a dead
       * input, which is the one lie it exists to prevent. Somebody with the
       * setting on would sing at it and watch nothing happen.
       *
       * Six frames a second still reads as a level and is far below the rate
       * the setting is meant to protect against. The smoothing constants below
       * are per-frame, so at this rate they land closer to a step than a
       * glide — which is the point. */
      if (reduced && now - last < 160) return;
      last = now;

      const analyser = analyserRef.current;
      if (!analyser) return;

      if (!spectrum || spectrum.length !== analyser.frequencyBinCount) {
        spectrum = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      }
      analyser.getByteFrequencyData(spectrum);

      /* Only the lower half of the spectrum is banded across the bars. Speech
         lives well below the Nyquist limit of a 48kHz stream, so mapping the
         whole range leaves the right-hand bars permanently dead. */
      const usable = Math.floor(spectrum.length / 2);
      const band = Math.max(1, Math.floor(usable / bars.length));

      for (let i = 0; i < bars.length; i++) {
        let peak = 0;
        for (let j = i * band; j < (i + 1) * band && j < usable; j++) {
          const value = (spectrum[j] ?? 0) / 255;
          if (value > peak) peak = value;
        }
        const target = peak < NOISE_FLOOR ? 0 : peak;
        const previous = heights[i] ?? 0;
        const next =
          target > previous
            ? previous + (target - previous) * ATTACK
            : previous + (target - previous) * RELEASE;
        heights[i] = next;
        const bar = bars[i];
        // A floor of 0.08 so the row still reads as a meter in silence
        // instead of vanishing into the panel.
        if (bar) bar.style.transform = `scaleY(${Math.max(0.08, next)})`;
      }
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, reduced, analyserRef]);

  return (
    <div
      ref={rowRef}
      aria-hidden="true"
      /* Sized, not stretched. This sits under the microphone button in a
         centred column, so a full-width row would run the meter out to the
         edges of the screen and stop reading as an instrument attached to
         that control. */
      className="flex h-7 w-40 items-end justify-center gap-[3px]"
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={`bar-${
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative row, no identity beyond position
            i
          }`}
          className="h-full flex-1 origin-bottom rounded-[1px] bg-brand/55"
          style={{ transform: "scaleY(0.08)" }}
        />
      ))}
    </div>
  );
}
