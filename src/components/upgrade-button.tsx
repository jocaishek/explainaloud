"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { PlanComparison } from "~/components/plan-comparison";
import { Button } from "~/components/ui/button";
import { PRO_PRICE_USD } from "~/lib/plans";
import { cn } from "~/lib/utils";

/**
 * "Upgrade to Pro" — the comparison first, checkout second.
 *
 * Opening the table rather than going straight to Stripe is deliberate: nobody
 * should reach a card form before they have seen what the money buys.
 */
export function UpgradeButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape closes it, which is what people reach for before hunting a button.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending]);

  async function startCheckout() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
      });
      const body = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !body.url) {
        setError(body.error ?? "Couldn't start checkout. Try again.");
        setPending(false);
        return;
      }
      // Stripe's own page. Leave `pending` set — the tab is navigating away and
      // re-enabling the button would invite a second checkout session.
      window.location.assign(body.url);
    } catch {
      setError("Couldn't reach checkout. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "gap-1.5 rounded-full border-brand/40 font-semibold text-brand transition-transform duration-200 ease-out hover:bg-brand/10 active:scale-[0.97]",
          className,
        )}
      >
        <Sparkles aria-hidden className="size-4" />
        Upgrade to Pro
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          {/* A real button rather than a div with a click handler: the backdrop
              is a genuine control, so it should be reachable and operable the
              same way every other control is. Escape is bound on the document
              above, which is what most people actually reach for. */}
          <button
            type="button"
            aria-label="Close"
            disabled={pending}
            onClick={() => setOpen(false)}
            className="absolute inset-0 size-full cursor-default bg-black/50 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-title"
            className="relative m-0 w-full max-w-2xl rounded-2xl border border-border bg-background p-6 text-foreground shadow-2xl"
          >
            <h2
              id="upgrade-title"
              className="text-xl font-semibold tracking-tight text-strong"
            >
              Go further with Pro
            </h2>
            <p className="mt-1 text-sm text-subtle">
              Longer explanations, more topics, and no daily recording cap — $
              {PRO_PRICE_USD.toFixed(2)} a month, cancel any time.
            </p>

            <PlanComparison className="mt-5" />

            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => void startCheckout()}
                disabled={pending}
                className="h-11 rounded-full bg-brand px-6 font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand)] transition-transform hover:bg-brand/90 active:scale-[0.97]"
              >
                {pending ? "Opening checkout…" : "Upgrade to Pro"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Not now
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
