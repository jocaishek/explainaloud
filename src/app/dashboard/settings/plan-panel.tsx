"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { PlanComparison } from "~/components/plan-comparison";
import { Button } from "~/components/ui/button";
import { UpgradeButton } from "~/components/upgrade-button";
import { type Plan, PRO_PRICE_USD, planLabel } from "~/lib/plans";

/**
 * Which plan this account is on, and the way off it.
 *
 * Cancelling opens Stripe's billing portal rather than a button here — see
 * `api/billing/portal`. It also means there is exactly one place a
 * subscription can be changed, so this panel can never drift out of step with
 * what Stripe believes.
 */
export function PlanPanel({
  plan,
  renewsAt,
  hasCustomer,
}: {
  plan: Plan;
  renewsAt: string | null;
  hasCustomer: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !body.url) {
        setError(body.error ?? "Couldn't open billing. Try again.");
        setPending(false);
        return;
      }
      window.location.assign(body.url);
    } catch {
      setError("Couldn't reach billing. Check your connection and try again.");
      setPending(false);
    }
  }

  const isPro = plan === "pro";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          {isPro && <Sparkles aria-hidden className="size-5 text-brand" />}
          <div>
            <p className="font-medium text-strong">
              {planLabel(plan)} plan
              {isPro && (
                <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 align-middle font-mono text-[10px] tracking-[0.14em] text-brand uppercase">
                  Active
                </span>
              )}
            </p>
            <p className="mt-0.5 text-sm text-subtle">
              {isPro
                ? renewsAt
                  ? `$${PRO_PRICE_USD.toFixed(2)}/month · renews ${new Date(renewsAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`
                  : `$${PRO_PRICE_USD.toFixed(2)}/month`
                : "3-minute recordings, 5 a day, 2 new topics a day."}
            </p>
          </div>
        </div>

        {isPro ? (
          hasCustomer && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => void openPortal()}
              className="rounded-full"
            >
              {pending ? "Opening…" : "Manage billing"}
            </Button>
          )
        ) : (
          <UpgradeButton />
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Subscribers get the table too — it is the record of what they bought. */}
      <PlanComparison highlight={isPro ? "pro" : null} />
    </div>
  );
}
