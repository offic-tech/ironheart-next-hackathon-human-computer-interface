import { NextRequest, NextResponse } from "next/server";
import { saveCallMemory } from "../../../../lib/hidobaKnowledge";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const result = await saveCallMemory({
      ...payload,
      source: payload?.source || "oya-frontend-memory",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[memory calls] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save call memory." },
      { status: 500 },
    );
  }
}
