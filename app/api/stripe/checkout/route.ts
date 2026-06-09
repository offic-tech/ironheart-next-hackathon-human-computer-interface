import { NextResponse } from "next/server";
import { getAppUrl, getStripe } from "../../../../lib/stripe";

type CheckoutRequestBody = {
  priceId?: string;
  customerId?: string;
  email?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
    const stripe = getStripe();
    const appUrl = getAppUrl();
    const priceId = body.priceId || process.env.STRIPE_DEFAULT_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing priceId. Pass priceId in the request body or set STRIPE_DEFAULT_PRICE_ID." },
        { status: 400 },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: body.customerId,
      customer_email: body.customerId ? undefined : body.email,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: {
        product: "oya-ai-meeting-copilot",
        ...(body.metadata || {}),
      },
      subscription_data: {
        metadata: {
          product: "oya-ai-meeting-copilot",
          ...(body.metadata || {}),
        },
      },
      success_url: body.successUrl || `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancelUrl || `${appUrl}/?checkout=cancelled`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe checkout failed." },
      { status: 500 },
    );
  }
}
