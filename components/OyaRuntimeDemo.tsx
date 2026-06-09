"use client";

import Image from "next/image";
import Script from "next/script";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    Telegram?: { WebApp?: { ready: () => void; expand: () => void } };
    BACKEND_URL?: string;
    FIREBASE_KEY?: string;
    CallManager?: new (options: Record<string, unknown>) => {
      handleCall2: (partner: string, character: string, apiKey: string) => Promise<void>;
      hangUp: () => void;
      mute: (muted: boolean) => void;
    };
  }
}

type RuntimeState = "idle" | "loading" | "active";
type ChatMessage = {
  originator: "user" | "bot";
  text: string;
  is_processed: boolean;
};

const apiKey =
  process.env.NEXT_PUBLIC_IRONHEART_API_KEY ||
  "US5Ccoik5EKkTmcw59iVn6t4YdBZkSpEDlNT8AxW";
const backendUrl =
  process.env.NEXT_PUBLIC_IRONHEART_BACKEND_URL ||
  "https://backend.funtimewithaisolutions.com";
const firebaseKey =
  process.env.NEXT_PUBLIC_FIREBASE_KEY ||
  "AIzaSyCWTgYvZ7TnYQiVdvJNDysBrzjNojxj2_s";
const partner = process.env.NEXT_PUBLIC_IRONHEART_PARTNER || "github:godfather";
const character = process.env.NEXT_PUBLIC_IRONHEART_CHARACTER || "oya";

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function localOyaReply(text: string) {
  const t = text.toLowerCase();
  if (t.includes("agenda") || t.includes("meeting")) {
    return "I would join as an active participant, confirm the agenda, track unresolved decisions, and surface the next useful question when the discussion stalls.";
  }
  if (t.includes("summary") || t.includes("notes")) {
    return "After the call I can publish structured notes: decisions, objections, owners, deadlines, follow-ups, and the exact open topics that still need human judgment.";
  }
  if (t.includes("zoom") || t.includes("otter") || t.includes("fireflies")) {
    return "The difference is that OYA is not only a recorder. OYA can speak during the meeting, ask clarifying questions, and keep the room aligned in real time.";
  }
  if (t.includes("runtime") || t.includes("api") || t.includes("ironheart")) {
    return "OYA runs on IronHeart.AI Runtime: realtime voice, memory, context, orchestration, and knowledge retrieval behind one meeting-native persona.";
  }
  return "For this meeting I would listen for goals, decisions, blockers, owner names, deadlines, and context drift. When the room gets stuck, I would speak with a short clarification or summary.";
}

export default function OyaRuntimeDemo() {
  const [sdkReady, setSdkReady] = useState(false);
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("idle");
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      originator: "bot",
      text: "Hi. I am OYA, the AI Digital Employee for live meetings. Ask me how I join, speak, remember context, or summarize decisions.",
      is_processed: true,
    },
  ]);

  const managerRef = useRef<InstanceType<NonNullable<typeof window.CallManager>> | null>(null);
  const dialRef = useRef<HTMLAudioElement | null>(null);
  const hangupRef = useRef<HTMLAudioElement | null>(null);

  const statusLabel = useMemo(() => {
    if (runtimeState === "loading") return "Joining meeting...";
    if (runtimeState === "active") return formatTime(seconds);
    return sdkReady ? "Ready to join" : "Loading runtime...";
  }, [runtimeState, sdkReady, seconds]);

  useEffect(() => {
    window.BACKEND_URL = backendUrl;
    window.FIREBASE_KEY = firebaseKey;
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    dialRef.current = new Audio("/assets/dial.mp3");
    dialRef.current.loop = true;
    hangupRef.current = new Audio("/assets/hangup.mp3");
    const retry = window.setInterval(() => {
      if (window.CallManager && !managerRef.current) initCallManager();
      if (managerRef.current) window.clearInterval(retry);
    }, 250);
    return () => window.clearInterval(retry);
  }, []);

  useEffect(() => {
    if (runtimeState !== "active") return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [runtimeState]);

  function stopDialTone() {
    if (!dialRef.current) return;
    dialRef.current.pause();
    dialRef.current.currentTime = 0;
  }

  function playHangup() {
    hangupRef.current?.play().catch(() => undefined);
  }

  function initCallManager() {
    if (!window.CallManager || managerRef.current) return;
    managerRef.current = new window.CallManager({
      onCallStart: () => {
        setRuntimeState("loading");
        dialRef.current?.play().catch(() => undefined);
      },
      onConnected: () => {
        stopDialTone();
        setSeconds(0);
        setRuntimeState("active");
      },
      onStatusUpdate: (status: string) => console.log("[OYA]", status),
      onUserInfo: () => undefined,
      onHangUp: () => {
        stopDialTone();
        playHangup();
        setRuntimeState("idle");
        setSeconds(0);
      },
      onCallError: () => {
        stopDialTone();
        playHangup();
        setRuntimeState("idle");
        setSeconds(0);
      },
    });
    setSdkReady(true);
  }

  async function startCall() {
    if (!managerRef.current || runtimeState !== "idle") return;
    setRuntimeState("loading");
    dialRef.current?.play().catch(() => undefined);
    try {
      await managerRef.current.handleCall2(partner, character, apiKey);
    } catch (error) {
      console.error(error);
      stopDialTone();
      playHangup();
      setRuntimeState("idle");
    }
  }

  function endCall() {
    stopDialTone();
    playHangup();
    setRuntimeState("idle");
    setSeconds(0);
    managerRef.current?.hangUp();
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    managerRef.current?.mute(next);
  }

  async function submitChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { originator: "user", text, is_processed: true },
    ];
    setChatInput("");
    setChatMessages([...nextMessages, { originator: "bot", text: "OYA is thinking...", is_processed: true }]);

    try {
      const response = await fetch("/api/oya/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      if (!response.ok) throw new Error("Text API failed");
      const data = (await response.json()) as { text?: string };
      setChatMessages([...nextMessages, { originator: "bot", text: data.text || localOyaReply(text), is_processed: true }]);
    } catch {
      setChatMessages([...nextMessages, { originator: "bot", text: localOyaReply(text), is_processed: true }]);
    }
  }

  return (
    <section className="relative overflow-hidden border border-white/10 bg-[#0d0d0a]/80 shadow-[0_44px_140px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div id="conversation-inner" className="hidden" />
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      <Script
        id="ironheart-runtime-bootstrap"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.BACKEND_URL=${JSON.stringify(backendUrl)};window.FIREBASE_KEY=${JSON.stringify(firebaseKey)};`,
        }}
      />
      <Script src="https://backend.funtimewithaisolutions.com/sdk/history.js" strategy="afterInteractive" />
      <Script src="https://backend.funtimewithaisolutions.com/sdk/audio.js" strategy="afterInteractive" />
      <Script
        src="https://backend.funtimewithaisolutions.com/sdk/sdk.js"
        strategy="afterInteractive"
        onLoad={initCallManager}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,166,35,0.18),transparent_38%),linear-gradient(180deg,transparent,rgba(0,0,0,0.58))]" />
      <div className="relative grid min-h-[760px] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative min-h-[620px] overflow-hidden">
          <Image
            src="/assets/character.jpg"
            alt="OYA AI Meeting Copilot"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-top opacity-88"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/10" />
          <div className="absolute left-6 right-6 top-6 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/70">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#3ddf8f] shadow-[0_0_16px_#3ddf8f]" />
              {statusLabel}
            </span>
            <span>IronHeart Runtime</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-7 sm:p-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#3ddf8f]">
              Meeting persona
            </p>
            <h2 className="mt-3 text-5xl font-semibold tracking-[-0.07em] sm:text-7xl">OYA</h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-white/76">
              A voice-native AI Digital Employee that joins the room, listens for context, speaks when useful,
              and leaves with structured memory.
            </p>
          </div>
        </div>

        <div className="relative flex flex-col justify-between p-6 sm:p-9">
          {runtimeState === "active" ? (
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#3ddf8f]">Live meeting</p>
                <h3 className="mt-4 text-4xl font-light leading-none tracking-[-0.05em] sm:text-6xl">
                  OYA is in the call.
                </h3>
                <div className="mt-8 rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 font-mono text-sm text-white/70">
                  Time in room: <span className="text-white">{formatTime(seconds)}</span>
                </div>
                <div className="mt-7 h-24 overflow-hidden border-y border-white/10 py-5">
                  <div className="oya-wave" />
                </div>
                <p className="mt-7 text-lg leading-8 text-white/68">
                  Listening for decisions, unresolved topics, ownership, deadlines, and points where the
                  discussion needs a verbal intervention.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-3">
                <button className="control-button bg-white text-black" onClick={endCall} type="button">
                  End
                </button>
                <button
                  className={`control-button ${muted ? "bg-[#f5a623] text-black" : "bg-white/8 text-white"}`}
                  onClick={toggleMute}
                  type="button"
                >
                  {muted ? "Unmute" : "Mute"}
                </button>
                <button
                  className={`control-button ${speakerOn ? "bg-[#3ddf8f] text-black" : "bg-white/8 text-white"}`}
                  onClick={() => setSpeakerOn((value) => !value)}
                  type="button"
                >
                  Audio
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#3ddf8f]">Runtime demo</p>
                <h3 className="mt-4 text-4xl font-light leading-none tracking-[-0.05em] sm:text-6xl">
                  Let the AI enter the meeting.
                </h3>
                <p className="mt-7 text-lg leading-8 text-white/68">
                  This starter prototype reuses IronHeart.AI call infrastructure: SDK loading, live voice
                  connection, dial tone, hangup tone, mute control, and a text endpoint for meeting logic.
                </p>
              </div>

              <div className="mt-10 space-y-4">
                <button
                  className="w-full rounded-full bg-white px-7 py-5 font-mono text-xs font-black uppercase tracking-[0.2em] text-black transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!sdkReady || runtimeState === "loading"}
                  onClick={startCall}
                  type="button"
                >
                  {runtimeState === "loading" ? "Joining..." : "Call OYA"}
                </button>
                <button
                  className="w-full rounded-full border border-white/15 bg-white/[0.06] px-7 py-5 font-mono text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
                  onClick={() => setChatOpen(true)}
                  type="button"
                >
                  Chat with OYA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className={`absolute inset-x-3 bottom-3 z-20 mx-auto max-w-2xl overflow-hidden border border-white/12 bg-black/80 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition duration-300 ${
          chatOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[110%] opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <strong className="text-sm">OYA meeting desk</strong>
            <p className="mt-1 text-xs text-white/50">Text runtime proxy with local fallback</p>
          </div>
          <button className="h-10 w-10 rounded-full border border-white/10 text-white/70" onClick={() => setChatOpen(false)}>
            x
          </button>
        </div>
        <div className="flex max-h-72 flex-col gap-3 overflow-auto p-4">
          {chatMessages.map((message, index) => (
            <div
              className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.originator === "user"
                  ? "ml-auto bg-white text-black"
                  : "mr-auto border border-white/10 bg-white/[0.07] text-white/80"
              }`}
              key={`${message.originator}-${index}`}
            >
              {message.text}
            </div>
          ))}
        </div>
        <form className="flex gap-2 border-t border-white/10 p-3" onSubmit={submitChat}>
          <input
            className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/35"
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Ask how OYA joins a meeting..."
            value={chatInput}
          />
          <button className="rounded-full bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-black" type="submit">
            Send
          </button>
        </form>
      </div>
    </section>
  );
}
