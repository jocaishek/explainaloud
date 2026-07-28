import "server-only";

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { env } from "~/env";
import type { Plan } from "~/lib/plans";

/**
 * Billing is optional infrastructure. Unconfigured, the upgrade button says so
 * and everything else keeps working on the free plan — a missing Stripe key
 * should not take the site down.
 */
export function billingConfigured() {
  return !!(
    env.STRIPE_SECRET_KEY &&
    env.STRIPE_PRICE_ID &&
    env.SUPABASE_SERVICE_ROLE_KEY
  );
}

let cached: Stripe | null = null;

export function stripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  // Reused across requests on a warm instance; Stripe's client is just an HTTP
  // wrapper and constructing one per call adds latency for nothing.
  cached ??= new Stripe(env.STRIPE_SECRET_KEY);
  return cached;
}

/**
 * A Supabase client that bypasses row-level security.
 *
 * Only the Stripe webhook may use this. It runs with no user session — Stripe
 * is the caller, not the subscriber — and it has to write `plan`, which the
 * migration deliberately forbids authenticated users from touching. Every
 * other server path must keep using the request-scoped client so RLS applies.
 */
export function serviceRoleClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Which plan a Stripe subscription status corresponds to.
 *
 * `past_due` and `unpaid` stay on Pro on purpose: a card that failed to renew
 * is usually a expired card, not a cancellation, and Stripe keeps retrying for
 * days. Dropping someone to Free the moment a retry fails would take away
 * something they are still paying for and is likely to be fixed within hours.
 * `canceled` is the one that actually ends access.
 */
export function planForStatus(status: Stripe.Subscription.Status): Plan {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "unpaid":
      return "pro";
    default:
      return "free";
  }
}
