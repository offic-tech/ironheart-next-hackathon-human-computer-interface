import { NextRequest, NextResponse } from "next/server";
import { createReadUrl } from "../../../../lib/s3Recordings";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { key?: string };

    if (!body.key) {
      return NextResponse.json({ error: "Recording key is required." }, { status: 400 });
    }

    const result = await createReadUrl(body.key);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[recordings read-url] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create recording read URL." },
      { status: 500 },
    );
  }
}
