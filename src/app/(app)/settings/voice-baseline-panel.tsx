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
        <p className="rounded-xl bg-surface px-4 py-3 text-sm leading-6 text-subtle">
          Your saved pace is{" "}
          <span className="font-medium text-strong">
            {existingWpm} words a minute
          </span>
          . Recording again replaces it.
        </p>
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
