import { NextResponse } from "next/server";
import { billingConfigured, stripeClient } from "~/lib/billing";
import { siteUrl } from "~/lib/site";
import { createClient } from "~/lib/supabase/server";

export const maxDuration = 30;

/**
 * Opens Stripe's billing portal, where a subscriber can change their card,
 * download invoices, or cancel.
 *
 * Cancelling belongs to Stripe rather than a button here: it has to handle
 * proration and end-of-period access, and a home-grown version that gets that
 * wrong either takes away time someone paid for or gives away time they didn't.
 */
export async function POST() {
  if (!billingConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't set up yet." },
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
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle<{ stripe_customer_id: string | null }>();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No subscription to manage yet." },
      { status: 404 },
    );
  }

  try {
    const session = await stripeClient().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl()}/dashboard/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal failed:", error);
    return NextResponse.json(
      { error: "Couldn't open billing. Try again shortly." },
      { status: 502 },
    );
  }
}
