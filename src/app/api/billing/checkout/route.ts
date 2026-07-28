import { NextResponse } from "next/server";
import { env } from "~/env";
import {
  billingConfigured,
  CHECKOUT_INTEGRATION_ID,
  stripeClient,
} from "~/lib/billing";
import { siteUrl } from "~/lib/site";
import { createClient } from "~/lib/supabase/server";

export const maxDuration = 30;

/**
 * Starts a Pro subscription.
 *
 * Returns a Stripe-hosted Checkout URL rather than taking card details here —
 * the card never touches this app, which is the whole reason to use Checkout.
 */
export async function POST() {
  if (!billingConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't set up yet. Try again shortly." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle<{ plan: string | null; stripe_customer_id: string | null }>();

  if (profile?.plan === "pro") {
    return NextResponse.json(
      { error: "You're already on Pro." },
      { status: 409 },
    );
  }

  try {
    const stripe = stripeClient();
    const origin = siteUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // Note there is no `payment_method_types` here, deliberately. Naming it
      // would pin checkout to whatever is listed and lock out every other
      // eligible method; omitted, Stripe picks from the Dashboard settings per
      // customer, which is what dynamic payment methods are for.
      integration_identifier: CHECKOUT_INTEGRATION_ID,
      // Reuse the customer when there is one, so a resubscribe lands on the
      // same Stripe record instead of creating a duplicate with the same email.
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      // The webhook is what actually grants Pro. This is only how we find the
      // right row when the event arrives — Stripe echoes it back on the
      // subscription, and it is the one identifier we control.
      client_reference_id: user.id,
      subscription_data: { metadata: { supabase_user_id: user.id } },
      metadata: { supabase_user_id: user.id },
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard/settings?upgraded=1`,
      cancel_url: `${origin}/dashboard?upgrade=cancelled`,
    });

    if (!session.url) {
      throw new Error("Stripe returned a session without a URL");
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout failed:", error);
    return NextResponse.json(
      { error: "Couldn't start checkout. Try again shortly." },
      { status: 502 },
    );
  }
}
