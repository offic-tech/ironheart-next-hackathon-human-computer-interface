import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      hasSession: Boolean(data.session),
      projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error: error instanceof Error ? error.message : "Unknown Supabase error",
      },
      { status: 500 },
    );
  }
}
