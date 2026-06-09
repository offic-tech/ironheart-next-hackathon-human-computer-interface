import { NextRequest, NextResponse } from "next/server";

const ttsApiOrigin =
  process.env.HIDOBA_TTS_API_ORIGIN ||
  process.env.NEXT_PUBLIC_IRONHEART_BACKEND_URL ||
  "https://backend.funtimewithaisolutions.com";

const ttsApiKey =
  process.env.HIDOBA_TTS_API_KEY ||
  process.env.IRONHEART_API_KEY ||
  process.env.NEXT_PUBLIC_IRONHEART_API_KEY ||
  "US5Ccoik5EKkTmcw59iVn6t4YdBZkSpEDlNT8AxW";

const ttsVoice = process.env.HIDOBA_TTS_VOICE || "godfather_avila_en_us_4751dc4d";

function cleanSpokenText(input: string) {
  return input
    .replace(/https?:\/\/\S+/g, "")
    .replace(/Sources:\s*[\s\S]*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1800);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    text?: string;
    voice?: string;
    language?: string;
    speed?: number;
  };

  const text = cleanSpokenText(body.text || "");
  if (!text) {
    return NextResponse.json({ error: "Text is required for TTS." }, { status: 400 });
  }

  const ttsResponse = await fetch(`${ttsApiOrigin}/v2/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ttsApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "ishikawa",
      voice: body.voice || ttsVoice,
      input: text,
      language: body.language || "auto",
      response_format: "mp3",
      speed: body.speed || 1,
    }),
  });

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text().catch(() => "");
    console.error("[hidoba tts failed]", {
      status: ttsResponse.status,
      response: errorText.slice(0, 500),
    });
    return NextResponse.json(
      { error: "Hidoba TTS request failed.", details: errorText },
      { status: ttsResponse.status },
    );
  }

  const audio = await ttsResponse.arrayBuffer();
  return new NextResponse(audio, {
    headers: {
      "Content-Type": ttsResponse.headers.get("content-type") || "audio/mpeg",
      "Cache-Control": "no-store",
      "X-Hidoba-TTS-Request-Id": ttsResponse.headers.get("x-hidoba-tts-request-id") || "",
    },
  });
}
