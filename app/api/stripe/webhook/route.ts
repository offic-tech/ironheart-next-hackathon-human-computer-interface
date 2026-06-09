import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "../../../../lib/stripe";
import { createAdminClient } from "../../../../utils/supabase/admin";

export const runtime = "nodejs";

function asTimestamp(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

async function recordStripeEvent(event: Stripe.Event) {
  const supabase = createAdminClient();

  if (!supabase) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is not configured. Stripe event was verified but not stored.");
    return;
  }

  const { error: eventError } = await supabase.from("stripe_events").upsert(
    {
      stripe_event_id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
      processed_at: new Date().toISOString(),
    },
    { onConflict: "stripe_event_id" },
  );

  if (eventError) {
    throw new Error(`Failed to record Stripe event: ${eventError.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id || null;

    if (stripeCustomerId) {
      await supabase.from("customers").upsert(
        {
          email: session.customer_details?.email || session.customer_email || null,
          name: session.customer_details?.name || null,
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_customer_id" },
      );
    }
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const stripeCustomerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const priceId = subscription.items.data[0]?.price.id || null;

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();

    await supabase.from("subscriptions").upsert(
      {
        customer_id: customer?.id || null,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        status: subscription.status,
        current_period_start: asTimestamp(subscription.items.data[0]?.current_period_start),
        current_period_end: asTimestamp(subscription.items.data[0]?.current_period_end),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" },
    );
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  try {
    const rawBody = await request.text();
    const event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);

    await recordStripeEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe webhook failed." },
      { status: 400 },
    );
  }
}
