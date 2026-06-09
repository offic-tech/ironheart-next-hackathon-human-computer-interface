"use client";

import { FormEvent, useState } from "react";

type BotResponse = {
  id?: string;
  state?: string;
  meeting_url?: string;
  voice_agent_url?: string;
  error?: string;
  details?: unknown;
};

export default function AttendeeJoinForm() {
  const [meetingUrl, setMeetingUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BotResponse | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = meetingUrl.trim();
    if (!value) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/attendee/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_url: value }),
      });
      const data = (await response.json()) as BotResponse;
      setResult(response.ok ? data : { error: data.error || "Unable to create Attendee bot", details: data.details });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-24 sm:px-10 lg:px-12" id="zoom">
      <div className="grid gap-8 border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.3)] sm:p-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-iron-green">Zoom connector</p>
          <h2 className="mt-5 text-4xl font-light leading-none tracking-[-0.05em] sm:text-6xl">
            Send OYA into a live meeting.
          </h2>
          <p className="mt-6 text-base leading-7 text-iron-muted">
            Paste a Zoom meeting URL. The server creates an attendee.dev bot named OYA and attaches the
            IronHeart voice-agent page so OYA can speak as an AI Digital Employee.
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
          <button
            className="min-h-16 rounded-full bg-white px-7 font-mono text-xs font-black uppercase tracking-[0.18em] text-black transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? "Creating OYA attendee..." : "Connect OYA to Zoom"}
          </button>

          {result ? (
            <div className="border border-white/10 bg-black/30 p-4 text-sm leading-6 text-white/70">
              {result.error ? (
                <p className="text-red-300">{result.error}</p>
              ) : (
                <>
                  <p>
                    OYA attendee created: <span className="text-white">{result.id}</span>
                  </p>
                  <p>
                    State: <span className="text-iron-green">{result.state}</span>
                  </p>
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
