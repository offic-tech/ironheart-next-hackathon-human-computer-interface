import { NextRequest, NextResponse } from "next/server";
import { getAttendeeSessionBotId } from "../../../../lib/attendeeSessions";

const attendeeApiOrigin = process.env.ATTENDEE_API_ORIGIN || "https://app.attendee.dev";
const attendeeApiKey = process.env.ATTENDEE_API_KEY;

export async function POST(request: NextRequest) {
  if (!attendeeApiKey) {
    return NextResponse.json(
      { error: "ATTENDEE_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    botId?: string;
    sessionId?: string;
    message?: string;
  };

  const botId = body.botId || (body.sessionId ? getAttendeeSessionBotId(body.sessionId) : undefined);
  const message = body.message?.trim();

  if (!botId) {
    return NextResponse.json({ error: "Attendee botId is required to send a Zoom chat message." }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const attendeeResponse = await fetch(`${attendeeApiOrigin}/api/v1/bots/${botId}/send_chat_message`, {
    method: "POST",
    headers: {
      Authorization: `Token ${attendeeApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: "everyone",
      message,
    }),
  });

  const data = await attendeeResponse.json().catch(() => ({}));
  if (!attendeeResponse.ok) {
    console.error("[attendee chat message failed]", { status: attendeeResponse.status, botId, response: data });
    return NextResponse.json(
      { error: "Attendee chat message failed.", details: data },
      { status: attendeeResponse.status },
    );
  }

  return NextResponse.json({ ok: true, botId, response: data });
}
