import { NextResponse } from "next/server";
import { getAppUrl, getStripe } from "../../../../lib/stripe";

type PortalRequestBody = {
  customerId?: string;
  returnUrl?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as PortalRequestBody;

    if (!body.customerId) {
      return NextResponse.json({ error: "Missing customerId." }, { status: 400 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: body.customerId,
      return_url: body.returnUrl || getAppUrl(),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe portal failed." },
      { status: 500 },
    );
  }
}
