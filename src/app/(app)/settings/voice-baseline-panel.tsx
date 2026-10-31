"use client";

import { useState } from "react";
import { VoiceWarmup, type WarmupResult } from "~/app/onboarding/voice-warmup";

/**
 * The warm-up, reachable after onboarding.
 *
 * Both the onboarding skip message and the gap report tell people they can do
 * this later in Settings, so it has to exist here or those are lies. It is also
 * the only route back for the majority who will skip a 30-second recording the
 * first time they are asked.
 *
 * Re-recording overwrites the stored baseline, which is the behaviour you want:
 * a number captured on a bad-microphone day should not follow someone around.
 */
export function VoiceBaselinePanel({
  existingWpm,
}: {
  /** The stored baseline, if the warm-up has been done before. */
  existingWpm: number | null;
}) {
  const [result, setResult] = useState<WarmupResult | null>(null);
  const [skipped, setSkipped] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {existingWpm && !result && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-border border-t pt-4">
          <div className="min-w-0">
            <p className="font-medium text-[0.9375rem] text-strong">
              Your usual pace
            </p>
            <p className="mt-0.5 text-sm text-subtle">
              Recording again below replaces it
            </p>
          </div>
          <p className="font-medium text-2xl text-strong tabular-nums">
            {existingWpm}
            <span className="ml-1 font-normal text-sm text-subtle">
              words a minute
            </span>
          </p>
        </div>
      )}

      <VoiceWarmup
        result={result}
        skipped={skipped}
        allowSkip={false}
        onComplete={(next) => {
          setResult(next);
          setSkipped(false);
        }}
        onSkip={() => setSkipped(true)}
      />
    </div>
  );
}
