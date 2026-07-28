import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "~/env";
import { planForStatus, serviceRoleClient, stripeClient } from "~/lib/billing";

export const maxDuration = 30;

/**
 * The only thing that grants or removes Pro.
 *
 * Deliberately not the checkout route: a user returning to a success URL proves
 * nothing — they can visit it directly — whereas a signature-verified event
 * from Stripe is the payment actually happening. Everything here is driven by
 * what Stripe says the subscription's status is right now.
 */
export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Stripe webhook hit with billing not configured");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Unsigned." }, { status: 400 });
  }

  // The raw body, not the parsed one: the signature covers the exact bytes
  // Stripe sent, so re-serialising parsed JSON would never verify.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    // A bad signature is the whole reason this check exists: without it,
    // anyone who found this URL could POST themselves a Pro subscription.
    console.error("Stripe signature verification failed:", error);
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  try {
    const stripe = stripeClient();
    let subscription: Stripe.Subscription | null = null;
    let userId: string | undefined;

    // A switch rather than a set membership test, so each branch narrows
    // `event.data.object` to the shape that event actually carries.
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        userId =
          session.client_reference_id ??
          session.metadata?.supabase_user_id ??
          undefined;
        if (typeof session.subscription === "string") {
          subscription = await stripe.subscriptions.retrieve(
            session.subscription,
          );
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        subscription = event.data.object;
        userId = subscription.metadata?.supabase_user_id ?? undefined;
        break;
      }
      default:
        // Acknowledge anything else, or Stripe retries it for days.
        return NextResponse.json({ received: true });
    }

    if (!subscription) {
      return NextResponse.json({ received: true });
    }

    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    const supabase = serviceRoleClient();

    // Prefer the id we put on the subscription ourselves. Fall back to the
    // customer id, which is how a change made in Stripe's own dashboard — or a
    // renewal months later — still finds the right row.
    if (!userId) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle<{ user_id: string }>();
      userId = data?.user_id;
    }

    if (!userId) {
      // Nothing to update, but don't ask Stripe to retry — the event is valid,
      // it just isn't about anyone we know.
      console.error("Stripe event for unknown user", {
        type: event.type,
        customerId,
      });
      return NextResponse.json({ received: true });
    }

    const plan = planForStatus(subscription.status);
    const periodEnd = subscription.items.data[0]?.current_period_end;

    const { error } = await supabase
      .from("profiles")
      .update({
        plan,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        plan_renews_at: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
      })
      .eq("user_id", userId);

    if (error) {
      // Return 500 so Stripe retries: the payment succeeded and the account
      // must end up on the right plan, so a transient database error has to be
      // tried again rather than swallowed.
      console.error("Failed to apply plan change:", error);
      return NextResponse.json({ error: "Update failed." }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling failed:", error);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
}
