import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const attendeeApiOrigin = process.env.ATTENDEE_API_ORIGIN || "https://app.attendee.dev";
const attendeeApiKey = process.env.ATTENDEE_API_KEY;

function getPublicOrigin(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  if (!attendeeApiKey) {
    return NextResponse.json(
      { error: "ATTENDEE_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as { meeting_url?: string; join_at?: string };
  const meetingUrl = body.meeting_url?.trim();
  if (!meetingUrl || !/^https:\/\/.+/i.test(meetingUrl)) {
    return NextResponse.json({ error: "A valid HTTPS Zoom meeting URL is required." }, { status: 400 });
  }

  const publicOrigin = getPublicOrigin(request);
  const voiceAgentUrl = `${publicOrigin}/agent?autostart=1&source=attendee`;
  const webhookUrl = `${publicOrigin}/api/attendee/webhook`;
  const deduplicationKey = createHash("sha256").update(`oya:${meetingUrl}`).digest("hex").slice(0, 32);

  const attendeeResponse = await fetch(`${attendeeApiOrigin}/api/v1/bots`, {
    method: "POST",
    headers: {
      Authorization: `Token ${attendeeApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      meeting_url: meetingUrl,
      bot_name: "OYA - AI Digital Employee",
      deduplication_key: deduplicationKey,
      join_at: body.join_at,
      voice_agent_settings: {
        url: voiceAgentUrl,
      },
      webhooks: [
        {
          url: webhookUrl,
          triggers: [
            "bot.state_change",
            "transcript.update",
            "chat_messages.update",
            "participant_events.join_leave",
          ],
        },
      ],
    }),
  });

  const data = await attendeeResponse.json().catch(() => ({}));
  if (!attendeeResponse.ok) {
    return NextResponse.json(
      { error: "Attendee bot creation failed.", details: data },
      { status: attendeeResponse.status },
    );
  }

  return NextResponse.json({
    ...data,
    voice_agent_url: voiceAgentUrl,
  });
}
