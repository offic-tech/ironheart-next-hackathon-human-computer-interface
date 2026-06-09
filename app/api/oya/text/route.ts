import { NextRequest, NextResponse } from "next/server";

type RuntimeMessage = {
  originator?: "user" | "bot";
  text?: string;
  is_processed?: boolean;
};

const apiOrigin =
  process.env.IRONHEART_TEXT_API_ORIGIN ||
  process.env.NEXT_PUBLIC_IRONHEART_BACKEND_URL ||
  "https://backend.funtimewithaisolutions.com";

const apiKey =
  process.env.IRONHEART_API_KEY ||
  process.env.NEXT_PUBLIC_IRONHEART_API_KEY ||
  "US5Ccoik5EKkTmcw59iVn6t4YdBZkSpEDlNT8AxW";

const partner = process.env.NEXT_PUBLIC_IRONHEART_PARTNER || "github:godfather";
const character = process.env.NEXT_PUBLIC_IRONHEART_CHARACTER || "oya";

function fallbackReply(messages: RuntimeMessage[]) {
  const last = [...messages].reverse().find((message) => message.originator === "user")?.text || "";
  const text = last.toLowerCase();
  if (text.includes("agenda")) return "OYA can open the meeting, restate the agenda, and keep the room aligned when the conversation drifts.";
  if (text.includes("summary")) return "OYA can publish decisions, unresolved topics, owners, deadlines, and follow-up notes after the meeting.";
  if (text.includes("speak")) return "Unlike passive note takers, OYA is designed as a meeting participant: it can speak, clarify, and summarize in real time.";
  return "OYA is a voice-native meeting participant powered by IronHeart.AI Runtime: memory, context, voice, orchestration, and knowledge retrieval.";
}

async function pollCompletion(statusUrl: string) {
  for (let index = 0; index < 18; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const poll = await fetch(statusUrl, { headers: { "X-Api-Key": apiKey } });
    if (!poll.ok) continue;
    const data = await poll.json();
    if (data.state === "failed") throw new Error("Text completion failed");
    if (data.state === "completed") {
      const output = data.output || data;
      const messages = output.messages || output.output?.messages || [];
      const last = [...messages].reverse().find((message) => message.originator === "bot" || !message.originator);
      return last?.text || output.text;
    }
  }
  throw new Error("Text completion timeout");
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { messages?: RuntimeMessage[] };
  const messages = body.messages || [];

  try {
    const completion = await fetch(`${apiOrigin}/v2/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({
        input: {
          messages,
          character: `${partner}/${character}`,
          num_options: 1,
          generate_audio: false,
        },
      }),
    });

    if (!completion.ok) throw new Error("Text API request failed");
    const job = await completion.json();
    const id = job.id || "";
    const statusUrl = id.startsWith("http") ? id : `${apiOrigin}${id}`;
    const text = await pollCompletion(statusUrl);
    return NextResponse.json({ text: text || fallbackReply(messages) });
  } catch {
    return NextResponse.json({ text: fallbackReply(messages), fallback: true });
  }
}
