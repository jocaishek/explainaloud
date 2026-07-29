/**
 * What each plan gets.
 *
 * These numbers are for *display and client behaviour only*. The daily caps are
 * enforced inside `claim_daily_quota`, which reads the subscription from the
 * database and never trusts a limit sent by the browser — so editing this file
 * changes what the pricing table promises, not what anyone is actually allowed
 * to do. Keep the two in step by hand; they are deliberately not shared, since
 * the alternative is shipping the enforcement rules to the client.
 */

export const PLANS = ["free", "pro"] as const;
export type Plan = (typeof PLANS)[number];

export function isPlan(value: unknown): value is Plan {
  return (
    typeof value === "string" && (PLANS as readonly string[]).includes(value)
  );
}

/** Monthly price in the smallest currency unit, for display only. */
export const PRO_PRICE_USD = 9.99;

/**
 * Longest single explanation, per plan.
 *
 * Three minutes is past the point where a teach-back stops being recall and
 * starts being reading aloud; five gives a Pro subscriber room for a dense
 * topic without changing that character.
 */
export const PLAN_RECORDING_MS: Record<Plan, number> = {
  free: 3 * 60_000,
  pro: 5 * 60_000,
};

/** `null` means no cap. */
export const PLAN_LIMITS: Record<
  Plan,
  { topic: number; recording: number | null }
> = {
  free: { topic: 2, recording: 5 },
  pro: { topic: 10, recording: null },
};

export type PlanFeature = {
  label: string;
  free: string | boolean;
  pro: string | boolean;
};

/**
 * The comparison table, in one place so the landing page, the upgrade dialog
 * and any future email all make the same promises.
 *
 * `false` renders as a cross, `true` as a tick, a string as itself — which lets
 * a row say "3 minutes" against "5 minutes" rather than pretending every
 * difference is a feature one side simply lacks.
 *
 * Rows that are identical on both plans use `true` on both sides rather than a
 * word. Writing "Included" there rendered as "Live gap colouring as you speak
 * Included" beside a bare label in the Pro column — the same promise phrased
 * two different ways, which reads as the free plan getting a lesser version of
 * something Pro simply has.
 */
export const PLAN_FEATURES: PlanFeature[] = [
  {
    label: "Recording length",
    free: `${PLAN_RECORDING_MS.free / 60_000} minutes`,
    pro: `${PLAN_RECORDING_MS.pro / 60_000} minutes`,
  },
  {
    label: "Recordings per day",
    free: String(PLAN_LIMITS.free.recording),
    pro: "Unlimited",
  },
  {
    label: "New topics per day",
    free: String(PLAN_LIMITS.free.topic),
    pro: String(PLAN_LIMITS.pro.topic),
  },
  { label: "Live gap colouring as you speak", free: true, pro: true },
  { label: "Full gap report and Re-Teach", free: true, pro: true },
  { label: "Build courses from your own sources", free: true, pro: true },
];

export function planLabel(plan: Plan) {
  return plan === "pro" ? "Pro" : "Free";
}
