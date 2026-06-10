import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  console.log("[recording complete]", JSON.stringify(body).slice(0, 2000));

  return NextResponse.json({
    ok: true,
    stored: false,
    note: "Recording metadata accepted. Persist to Supabase when SUPABASE_SERVICE_ROLE_KEY and schema are finalized.",
    recording: body,
  });
}
