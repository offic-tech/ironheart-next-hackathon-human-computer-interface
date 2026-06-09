import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const event = await request.json().catch(() => null);
  console.log("[attendee webhook]", JSON.stringify(event));
  return NextResponse.json({ ok: true });
}
