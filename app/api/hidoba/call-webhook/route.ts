import { NextRequest, NextResponse } from "next/server";
import { saveCallMemory } from "../../../../lib/hidobaKnowledge";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.HIDOBA_CALL_WEBHOOK_SECRET;

  if (webhookSecret) {
    const providedSecret = request.headers.get("x-webhook-secret") || request.nextUrl.searchParams.get("secret");
    if (providedSecret !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
    }
  }

  try {
    const payload = await request.json();
    console.log("[hidoba call webhook]", JSON.stringify(payload).slice(0, 3000));
    const result = await saveCallMemory({
      ...payload,
      source: payload?.source || "hidoba-call-webhook",
    });

    return NextResponse.json({ ok: true, memory: result });
  } catch (error) {
    console.error("[hidoba call webhook] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process Hidoba call webhook." },
      { status: 500 },
    );
  }
}
