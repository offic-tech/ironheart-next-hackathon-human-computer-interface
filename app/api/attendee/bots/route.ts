import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { setAttendeeSession } from "../../../../lib/attendeeSessions";

const attendeeApiOrigin = process.env.ATTENDEE_API_ORIGIN || "https://app.attendee.dev";
const attendeeApiKey = process.env.ATTENDEE_API_KEY;

type MeetingProvider = "zoom" | "google_meet" | "generic";

function getPublicOrigin(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return `${proto}://${host}`;
}

function getMeetingProvider(url: string): MeetingProvider {
  if (/meet\.google\.com/i.test(url)) return "google_meet";
  if (/zoom\.us|zoomgov\.com/i.test(url)) return "zoom";
  return "generic";
}

function isValidMeetingUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function isGoogleMeetUrl(url: string) {
  const normalized = url.trim().toLowerCase();
  return normalized.startsWith("https://meet.google.com/") || normalized.includes("meet.google.com");
}

export async function POST(request: NextRequest) {
  if (!attendeeApiKey) {
    return NextResponse.json(
      { error: "ATTENDEE_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as { meeting_url?: string; google_meet_url?: string; join_at?: string };
  const meetingUrl = (body.meeting_url || body.google_meet_url || "").trim();
  if (!meetingUrl || !isValidMeetingUrl(meetingUrl)) {
    return NextResponse.json({ error: "Error: invalid meeting link" }, { status: 400 });
  }
  if (body.google_meet_url && !isGoogleMeetUrl(body.google_meet_url)) {
    return NextResponse.json({ error: "Error: invalid meeting link" }, { status: 400 });
  }

  const provider = getMeetingProvider(meetingUrl);
  const publicOrigin = getPublicOrigin(request);
  const sessionId = randomUUID();
  const voiceAgentUrl = `${publicOrigin}/agent?autostart=1&source=attendee&sessionId=${encodeURIComponent(sessionId)}`;
  const payload: Record<string, unknown> = {
    meeting_url: meetingUrl,
    bot_name: "OYA - AI Digital Employee",
    join_at: body.join_at,
    voice_agent_settings: {
      url: voiceAgentUrl,
    },
  };

  if (provider === "zoom") {
    payload.zoom_settings = {
      sdk: "web",
    };
  }

  const attendeeResponse = await fetch(`${attendeeApiOrigin}/api/v1/bots`, {
    method: "POST",
    headers: {
      Authorization: `Token ${attendeeApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await attendeeResponse.json().catch(() => ({}));
  if (!attendeeResponse.ok) {
    console.error("[attendee bot creation failed]", {
      status: attendeeResponse.status,
      payload,
      response: data,
    });
    return NextResponse.json(
      { error: "Attendee bot creation failed.", details: data },
      { status: attendeeResponse.status },
    );
  }

  const botId = data.id;
  const finalVoiceAgentUrl = botId
    ? `${publicOrigin}/agent?autostart=1&source=attendee&sessionId=${encodeURIComponent(sessionId)}&botId=${encodeURIComponent(botId)}`
    : voiceAgentUrl;

  if (botId) {
    setAttendeeSession(sessionId, {
      botId,
      meetingUrl,
      provider,
      state: data.state,
    });
    const patchResponse = await fetch(`${attendeeApiOrigin}/api/v1/bots/${botId}/voice_agent_settings`, {
      method: "PATCH",
      headers: {
        Authorization: `Token ${attendeeApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: finalVoiceAgentUrl,
      }),
    });

    if (!patchResponse.ok) {
      const patchData = await patchResponse.json().catch(() => ({}));
      console.warn("[attendee voice agent settings patch failed]", {
        status: patchResponse.status,
        botId,
        response: patchData,
      });
    }
  }

  return NextResponse.json({
    ...data,
    sessionId,
    meeting_url: meetingUrl,
    provider,
    voice_agent_url: finalVoiceAgentUrl,
    request_payload: payload,
  });
}
