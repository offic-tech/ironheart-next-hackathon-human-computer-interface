import { NextRequest, NextResponse } from "next/server";
import { renderAnalysisMarkdown, summarizeTranscriptWithBedrock } from "../../../../../lib/awsPostCall";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { transcript?: string };

    if (!body.transcript) {
      return NextResponse.json({ error: "transcript is required." }, { status: 400 });
    }

    const analysis = await summarizeTranscriptWithBedrock(body.transcript);

    return NextResponse.json({
      ok: true,
      analysis,
      markdown: renderAnalysisMarkdown(analysis),
    });
  } catch (error) {
    console.error("[aws bedrock summarize] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AWS Bedrock summarize failed." },
      { status: 500 },
    );
  }
}
