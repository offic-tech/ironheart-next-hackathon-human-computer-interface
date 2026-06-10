import { NextRequest, NextResponse } from "next/server";
import { createUploadUrl } from "../../../../lib/s3Recordings";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      contentType?: string;
      sessionId?: string;
      botId?: string;
    };

    const result = await createUploadUrl(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[recordings upload-url] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create recording upload URL." },
      { status: 500 },
    );
  }
}
