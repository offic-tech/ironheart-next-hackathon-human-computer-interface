"use client";

import { FormEvent, useState } from "react";

type BotResponse = {
  id?: string;
  state?: string;
  meeting_url?: string;
  provider?: string;
  voice_agent_url?: string;
  request_payload?: unknown;
  error?: string;
  details?: unknown;
};

export default function AttendeeJoinForm() {
  const [meetingUrl, setMeetingUrl] = useState("");
  const [googleMeetUrl, setGoogleMeetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BotResponse | null>(null);
  const [status, setStatus] = useState("");

  function isGoogleMeetUrl(value: string) {
    const normalized = value.trim().toLowerCase();
    return normalized.startsWith("https://meet.google.com/") || normalized.includes("meet.google.com");
  }

  function getStatusLabel(response: BotResponse) {
    if (response.error) return response.error;
    if (response.state === "waiting_room") return "Waiting room / needs host approval";
    return "Bot created";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const zoomValue = meetingUrl.trim();
    const meetValue = googleMeetUrl.trim();
    const value = meetValue || zoomValue;
    if (!value) return;

    if (meetValue && !isGoogleMeetUrl(meetValue)) {
      setResult({ error: "Error: invalid meeting link" });
      setStatus("Error: invalid meeting link");
      return;
    }

    setLoading(true);
    setResult(null);
    setStatus("Joining meeting...");
    try {
      const response = await fetch("/api/attendee/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meetValue ? { meeting_url: value, google_meet_url: value } : { meeting_url: value }),
      });
      const data = (await response.json()) as BotResponse;
      const nextResult = response.ok ? data : { error: data.error || "Unable to create Attendee bot", details: data.details };
      setResult(nextResult);
      setStatus(getStatusLabel(nextResult));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      setResult({ error: message });
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-24 sm:px-10 lg:px-12" id="zoom">
      <div className="grid gap-8 border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.3)] sm:p-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-iron-green">Meeting connector</p>
          <h2 className="mt-5 text-4xl font-light leading-none tracking-[-0.05em] sm:text-6xl">
            Send OYA into a live meeting.
          </h2>
          <p className="mt-6 text-base leading-7 text-iron-muted">
            Paste a Zoom or Google Meet URL. The server creates an attendee.dev bot named OYA and attaches
            the IronHeart voice-agent page so OYA can speak as an AI Digital Employee.
          </p>
        </div>

        <form className="flex flex-col justify-center gap-4" onSubmit={submit}>
          <label className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50" htmlFor="meeting-url">
            Zoom meeting URL
          </label>
          <input
            className="min-h-16 w-full border border-white/10 bg-black/30 px-5 text-base text-white outline-none placeholder:text-white/30 focus:border-iron-green/60"
            id="meeting-url"
            onChange={(event) => setMeetingUrl(event.target.value)}
            placeholder="https://zoom.us/j/123456789?pwd=..."
            type="url"
            value={meetingUrl}
          />
          <label className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50" htmlFor="google-meet-url">
            Google Meet Link
          </label>
          <input
            className="min-h-16 w-full border border-white/10 bg-black/30 px-5 text-base text-white outline-none placeholder:text-white/30 focus:border-iron-green/60"
            id="google-meet-url"
            onChange={(event) => setGoogleMeetUrl(event.target.value)}
            placeholder="Paste your Google Meet URL"
            type="url"
            value={googleMeetUrl}
          />
          <button
            className="min-h-16 rounded-full bg-white px-7 font-mono text-xs font-black uppercase tracking-[0.18em] text-black transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? "Joining meeting..." : "Connect OYA to Meeting"}
          </button>

          {status ? (
            <p
              className={`font-mono text-[11px] uppercase tracking-[0.16em] ${
                status.startsWith("Error") ? "text-red-300" : status.startsWith("Waiting") ? "text-yellow-200" : "text-iron-green"
              }`}
            >
              {status}
            </p>
          ) : null}

          {result ? (
            <div className="border border-white/10 bg-black/30 p-4 text-sm leading-6 text-white/70">
              {result.error ? (
                <>
                  <p className="text-red-300">{result.error}</p>
                  {result.details ? (
                    <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/50 p-3 text-xs text-white/55">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  ) : null}
                </>
              ) : (
                <>
                  <p>
                    OYA attendee created: <span className="text-white">{result.id}</span>
                  </p>
                  <p>
                    State: <span className="text-iron-green">{result.state}</span>
                  </p>
                  <p>
                    Provider: <span className="text-white">{result.provider || "attendee"}</span>
                  </p>
                  {result.meeting_url ? <p className="break-all text-white/45">Meeting URL: {result.meeting_url}</p> : null}
                  {result.voice_agent_url ? <p className="break-all text-white/45">Agent URL: {result.voice_agent_url}</p> : null}
                </>
              )}
            </div>
          ) : null}
        </form>
      </div>
    </section>
  );
}
