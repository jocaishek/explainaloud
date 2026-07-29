import { Check, X } from "lucide-react";
import { PLAN_FEATURES, PRO_PRICE_USD } from "~/lib/plans";
import { cn } from "~/lib/utils";

/**
 * The Free-versus-Pro table.
 *
 * One component for the landing page and the in-app upgrade dialog, because
 * the two must never disagree about what Pro includes — a pricing page that
 * promises something the upgrade dialog doesn't is a support ticket at best.
 */
export function PlanComparison({
  className,
  highlight = "pro",
}: {
  className?: string;
  /** Which column to draw attention to. */
  highlight?: "free" | "pro" | null;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-border bg-surface",
        className,
      )}
    >
      {/* Wide enough to need scrolling on a narrow phone; the page itself must
          never scroll sideways, so the overflow is contained here. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-sm">
          <caption className="sr-only">
            A comparison of the Free and Pro plans
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="p-4 text-left font-medium text-subtle">
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase">
                  What you get
                </span>
              </th>
              <th
                scope="col"
                className={cn(
                  "p-4 text-left",
                  highlight === "free" && "bg-brand/[0.04]",
                )}
              >
                <span className="block font-semibold text-strong">Free</span>
                <span className="mt-0.5 block text-xs text-subtle">
                  $0 forever
                </span>
              </th>
              <th
                scope="col"
                className={cn(
                  "p-4 text-left",
                  highlight === "pro" && "bg-brand/[0.06]",
                )}
              >
                <span className="block font-semibold text-brand">Pro</span>
                <span className="mt-0.5 block text-xs text-subtle">
                  ${PRO_PRICE_USD.toFixed(2)}/month
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {PLAN_FEATURES.map((feature) => (
              <tr
                key={feature.label}
                className="border-b border-border last:border-0"
              >
                <th
                  scope="row"
                  className="p-4 text-left font-normal text-foreground"
                >
                  {feature.label}
                </th>
                <td
                  className={cn(
                    "p-4",
                    highlight === "free" && "bg-brand/[0.04]",
                  )}
                >
                  <Cell value={feature.free} />
                </td>
                <td
                  className={cn(
                    "p-4",
                    highlight === "pro" && "bg-brand/[0.06]",
                  )}
                >
                  <Cell value={feature.pro} accent />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * A tick, a cross, or a value.
 *
 * Rows where the plans differ by degree rather than presence — three minutes
 * against five — say the number. Reducing that to a cross would read as "Free
 * has no recordings", which is both wrong and needlessly discouraging.
 */
function Cell({
  value,
  accent,
}: {
  value: string | boolean;
  accent?: boolean;
}) {
  if (value === false) {
    return (
      <>
        <X aria-hidden className="size-4 text-subtle" />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  if (value === true) {
    return (
      <>
        <Check
          aria-hidden
          className={cn("size-4", accent ? "text-brand" : "text-green-500")}
        />
        <span className="sr-only">Included</span>
      </>
    );
  }
  return (
    <span className="flex items-center gap-2 text-foreground">
      <Check
        aria-hidden
        className={cn(
          "size-4 shrink-0",
          accent ? "text-brand" : "text-green-500",
        )}
      />
      {value}
    </span>
  );
}
