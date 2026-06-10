import { NextRequest, NextResponse } from "next/server";
import { createCallStoragePrefix, uploadTextObject } from "../../../../../lib/s3Recordings";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      callId?: string;
      filename?: string;
      content?: string;
      contentType?: string;
      kind?: string;
    };

    if (!body.content) {
      return NextResponse.json({ error: "content is required." }, { status: 400 });
    }

    const prefix = createCallStoragePrefix(body.callId);
    const filename = (body.filename || `${body.kind || "document"}.md`).replace(/[^a-zA-Z0-9._-]+/g, "-");
    const result = await uploadTextObject({
      key: `${prefix}/${filename}`,
      body: body.content,
      contentType: body.contentType || "text/markdown; charset=utf-8",
      metadata: {
        product: "oya",
        kind: body.kind || "document",
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[aws s3 upload] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AWS S3 upload failed." },
      { status: 500 },
    );
  }
}
