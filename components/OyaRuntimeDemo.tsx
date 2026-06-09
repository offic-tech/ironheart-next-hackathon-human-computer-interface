"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    Telegram?: { WebApp?: { ready: () => void; expand: () => void } };
    BACKEND_URL?: string;
    FIREBASE_KEY?: string;
    OYA_API_CALL_INSTRUCTIONS?: string;
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

type ExaSearchResponse = {
  answer?: string;
  bullets?: string[];
  results?: Array<{
    title?: string;
    url?: string;
    highlights?: string[];
  }>;
  error?: string;
  details?: unknown;
};

type ApiCall = {
  type: string;
  query: string;
};

const OYA_API_CALL_INSTRUCTIONS = `When you need real-time internet search or external data, output this command instead of normal speech:

[[API_CALL]]
type: internet_search
query: <search query>
[[/API_CALL]]

Only use this command when fresh external information is needed.`;

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

function shouldUseExa(text: string) {
  const normalized = text.toLowerCase();
  return [
    "search",
    "find",
    "look up",
    "lookup",
    "research",
    "latest",
    "recent",
    "google",
    "source",
    "sources",
    "what is happening",
    "i will search",
    "i'll search",
    "let me search",
    "let me look",
    "checking",
    "i am searching",
    "i'm searching",
    "что",
    "найди",
    "поищи",
    "посмотри",
    "исследуй",
    "свеж",
    "последн",
  ].some((trigger) => normalized.includes(trigger));
}

function isOyaSearchPendingMessage(text: string) {
  const normalized = text.toLowerCase();
  return [
    "i made a request",
    "i have made a request",
    "i sent a request",
    "i have sent a request",
    "waiting for a response",
    "waiting for the response",
    "waiting for an answer",
    "i am waiting for",
    "i'm waiting for",
    "i will wait for",
    "i'll wait for",
    "let me wait",
    "я сделала запрос",
    "я сделал запрос",
    "я отправила запрос",
    "я отправил запрос",
    "жду ответ",
    "жду ответа",
    "подожду ответ",
    "ожидаю ответ",
    "запрос отправлен",
  ].some((trigger) => normalized.includes(trigger));
}

function isSearchResultMessage(text: string) {
  const normalized = text.toLowerCase();
  return normalized.includes("oya found this in real time") || normalized.includes("sources:") || normalized.includes("real-time search failed");
}

function formatExaReply(data: ExaSearchResponse) {
  if (data.error) return `I could not search Exa yet: ${data.error}`;
  const bullets = data.bullets?.length ? `\n\n${data.bullets.map((bullet) => `- ${bullet}`).join("\n")}` : "";
  const sources = (data.results || [])
    .filter((result) => result.title && result.url)
    .slice(0, 3)
    .map((result, index) => `${index + 1}. ${result.title} — ${result.url}`)
    .join("\n");
  return `${data.answer || "I found relevant sources, but Exa did not return a synthesized answer."}${bullets}${
    sources ? `\n\nSources:\n${sources}` : ""
  }`;
}

function parseApiCall(message: string): ApiCall | null {
  const match = message.match(/\[\[API_CALL\]\]([\s\S]*?)\[\[\/API_CALL\]\]/i);
  if (!match) return null;

  const body = match[1];
  const type = body.match(/type:\s*(.+)/i)?.[1]?.trim();
  const query = body.match(/query:\s*([\s\S]+)/i)?.[1]?.trim();

  if (!type || !query) return null;
  return { type, query };
}

function cleanRuntimeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function formatZoomSearchMessage(query: string, data: ExaSearchResponse) {
  if (data.error) {
    return `OYA could not complete the real-time search for "${query}". Error: ${data.error}`;
  }

  const bullets = data.bullets?.length
    ? data.bullets.slice(0, 4).map((bullet) => `- ${bullet}`).join("\n")
    : "";
  const sources = (data.results || [])
    .filter((result) => result.title && result.url)
    .slice(0, 3)
    .map((result, index) => `${index + 1}. ${result.title} — ${result.url}`)
    .join("\n");

  return [
    "OYA found this in real time:",
    "",
    data.answer || `Search query: ${query}`,
    bullets,
    sources ? `Sources:\n${sources}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function createDialAudio() {
  const audio = new Audio();
  audio.src = audio.canPlayType("audio/webm; codecs=opus") ? "/assets/dial.webm" : "/assets/dial.mp3";
  audio.loop = true;
  return audio;
}

function resolveRuntimeGlobals() {
  const scope = window as Window & {
    AudioClient?: unknown;
  };

  if (!scope.CallManager) {
    try {
      scope.CallManager = Function("return typeof CallManager !== 'undefined' ? CallManager : undefined")();
    } catch {
      scope.CallManager = undefined;
    }
  }

  if (!scope.AudioClient) {
    try {
      scope.AudioClient = Function("return typeof AudioClient !== 'undefined' ? AudioClient : undefined")();
    } catch {
      scope.AudioClient = undefined;
    }
  }

  return Boolean(scope.CallManager);
}

type OyaRuntimeDemoProps = {
  autoStart?: boolean;
  agentMode?: boolean;
};

export default function OyaRuntimeDemo({ autoStart = false, agentMode = false }: OyaRuntimeDemoProps) {
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
  const speechRef = useRef<HTMLAudioElement | null>(null);
  const autoStartedRef = useRef(false);
  const processedApiCallsRef = useRef<Set<string>>(new Set());
  const botContextRef = useRef<{ botId?: string; sessionId?: string }>({});
  const memorySavedRef = useRef(false);

  const statusLabel = useMemo(() => {
    if (runtimeState === "loading") return "Joining meeting...";
    if (runtimeState === "active") return formatTime(seconds);
    return sdkReady ? "Ready to join" : "Loading runtime...";
  }, [runtimeState, sdkReady, seconds]);

  useEffect(() => {
    window.BACKEND_URL = backendUrl;
    window.FIREBASE_KEY = firebaseKey;
    window.OYA_API_CALL_INSTRUCTIONS = OYA_API_CALL_INSTRUCTIONS;
    const params = new URLSearchParams(window.location.search);
    botContextRef.current = {
      botId: params.get("botId") || undefined,
      sessionId: params.get("sessionId") || undefined,
    };
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    dialRef.current = createDialAudio();
    hangupRef.current = new Audio("/assets/hangup.mp3");
    speechRef.current = new Audio();
    const retry = window.setInterval(() => {
      resolveRuntimeGlobals();
      if (window.CallManager && !managerRef.current) initCallManager();
      if (managerRef.current) window.clearInterval(retry);
    }, 250);
    return () => window.clearInterval(retry);
  }, []);

  useEffect(() => {
    function handleBeforeUnload() {
      void saveCallMemory("browser-beforeunload");
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const conversation = document.getElementById("conversation-inner");
    if (!conversation) return;
    const conversationElement = conversation;

    async function executeApiCall(apiCall: ApiCall, sourceKey: string) {
      if (apiCall.type !== "internet_search") {
        console.warn("[OYA API_CALL] Unsupported type", apiCall);
        return;
      }

      try {
        console.log("[OYA API_CALL] internet_search", apiCall.query);
        const searchResponse = await fetch("/api/exa/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: apiCall.query, type: "auto", numResults: 5 }),
        });
        const searchData = (await searchResponse.json()) as ExaSearchResponse;
        if (!searchResponse.ok) throw new Error(searchData.error || "Exa search failed");

        const message = formatZoomSearchMessage(apiCall.query, searchData);
        await Promise.allSettled([sendZoomChatMessage(message), speakSearchResult(message)]);
      } catch (error) {
        console.error("[OYA API_CALL] failed", error);
        const message = `OYA real-time search failed: ${error instanceof Error ? error.message : "Unknown error"}`;
        await fetch("/api/attendee/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...botContextRef.current,
            message,
          }),
        }).catch(() => undefined);
      } finally {
        processedApiCallsRef.current.add(sourceKey);
      }
    }

    async function sendZoomChatMessage(message: string) {
      const chatResponse = await fetch("/api/attendee/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...botContextRef.current,
          message,
        }),
      });
      const chatData = await chatResponse.json().catch(() => ({}));
      if (!chatResponse.ok) {
        console.error("[OYA API_CALL] Attendee chat failed", chatData);
      }
    }

    async function speakSearchResult(message: string) {
      try {
        const spokenText = message
          .replace(/^OYA found this in real time:\s*/i, "")
          .replace(/Sources:\s*[\s\S]*/i, "")
          .trim();

        if (!spokenText || !speechRef.current) return;

        const response = await fetch("/api/hidoba/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `I found this in real time. ${spokenText}`,
            language: "auto",
          }),
        });

        if (!response.ok) {
          const details = await response.json().catch(() => ({}));
          console.error("[OYA TTS] failed", details);
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        speechRef.current.pause();
        speechRef.current.src = url;
        speechRef.current.onended = () => URL.revokeObjectURL(url);
        await speechRef.current.play();
      } catch (error) {
        console.error("[OYA TTS] playback failed", error);
      }
    }

    function scanConversation() {
      const messages = Array.from(conversationElement.querySelectorAll('[id^="message-"]')).map((element) => {
        const className = element.getAttribute("class") || "";
        const text = cleanRuntimeText(element.textContent || "");
        const isHuman =
          className.includes("human") ||
          className.includes("user") ||
          className.includes("client") ||
          element.id.toLowerCase().includes("human") ||
          element.id.toLowerCase().includes("user");

        return { element, className, text, isHuman };
      });

      messages.forEach((message, index) => {
        const previousHumanMessage = [...messages]
          .slice(0, index)
          .reverse()
          .find((candidate) => candidate.isHuman && candidate.text.length > 7);

        const pendingSearchCall =
          !message.isHuman && isOyaSearchPendingMessage(message.text) && previousHumanMessage
            ? { type: "internet_search", query: previousHumanMessage.text }
            : null;

        const apiCall =
          parseApiCall(message.text) ||
          pendingSearchCall ||
          (message.isHuman && shouldUseExa(message.text) && !isSearchResultMessage(message.text)
            ? { type: "internet_search", query: message.text }
            : null);

        const fallbackBotSearchCall =
          !message.isHuman &&
          shouldUseExa(message.text) &&
          !isSearchResultMessage(message.text) &&
          previousHumanMessage
            ? { type: "internet_search", query: previousHumanMessage.text }
            : null;

        const finalApiCall = apiCall || fallbackBotSearchCall;

        if (!finalApiCall || finalApiCall.query.length < 8) return;

        const sourceKey = `${message.isHuman ? "human" : "bot"}:${message.element.id}:${finalApiCall.type}:${finalApiCall.query}`;
        if (processedApiCallsRef.current.has(sourceKey)) return;
        processedApiCallsRef.current.add(sourceKey);
        void executeApiCall(finalApiCall, sourceKey);
      });
    }

    const observer = new MutationObserver(scanConversation);
    observer.observe(conversationElement, { childList: true, subtree: true, characterData: true });
    scanConversation();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (runtimeState !== "active") return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [runtimeState]);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || !sdkReady || runtimeState !== "idle") return;
    autoStartedRef.current = true;
    startCall();
  }, [autoStart, sdkReady, runtimeState]);

  function stopDialTone() {
    if (!dialRef.current) return;
    dialRef.current.pause();
    dialRef.current.currentTime = 0;
  }

  function playHangup() {
    hangupRef.current?.play().catch(() => undefined);
  }

  function initCallManager() {
    resolveRuntimeGlobals();
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
        void saveCallMemory("runtime-hangup");
        stopDialTone();
        playHangup();
        setRuntimeState("idle");
        setSeconds(0);
      },
      onCallError: () => {
        void saveCallMemory("runtime-error");
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
    memorySavedRef.current = false;
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
    void saveCallMemory("manual-end-call");
    stopDialTone();
    playHangup();
    setRuntimeState("idle");
    setSeconds(0);
    managerRef.current?.hangUp();
  }

  function collectRuntimeTranscript() {
    const conversation = document.getElementById("conversation-inner");
    if (!conversation) return "";

    const messages = Array.from(conversation.querySelectorAll('[id^="message-"]'));
    const transcript = messages
      .map((element, index) => {
        const className = element.getAttribute("class") || "";
        const speaker = className.includes("human") ? "User" : className.includes("bot") ? "OYA" : `Speaker ${index + 1}`;
        const text = cleanRuntimeText(element.textContent || "");
        return text ? `${speaker}: ${text}` : "";
      })
      .filter(Boolean)
      .join("\n");

    return transcript.trim();
  }

  async function saveCallMemory(reason: string) {
    if (memorySavedRef.current) return;

    const transcript = collectRuntimeTranscript();
    if (!transcript || transcript.length < 8) return;

    memorySavedRef.current = true;

    try {
      await fetch("/api/memory/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          title: `OYA Meeting ${new Date().toISOString()}`,
          transcript,
          reason,
          duration_seconds: seconds,
          ...botContextRef.current,
        }),
      });
    } catch (error) {
      memorySavedRef.current = false;
      console.error("[OYA memory] save failed", error);
    }
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
      const endpoint = shouldUseExa(text) ? "/api/exa/search" : "/api/oya/text";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shouldUseExa(text) ? { query: text, type: "auto", numResults: 5 } : { messages: nextMessages }),
      });
      if (!response.ok) throw new Error("Text API failed");
      const data = (await response.json()) as ({ text?: string } & ExaSearchResponse);
      const reply = shouldUseExa(text) ? formatExaReply(data) : data.text || localOyaReply(text);
      setChatMessages([...nextMessages, { originator: "bot", text: reply, is_processed: true }]);
    } catch {
      setChatMessages([...nextMessages, { originator: "bot", text: localOyaReply(text), is_processed: true }]);
    }
  }

  return (
    <section
      className={`relative overflow-hidden border border-white/10 bg-[#0d0d0a]/80 shadow-[0_44px_140px_rgba(0,0,0,0.55)] backdrop-blur-xl ${
        agentMode ? "h-screen w-screen border-0" : ""
      }`}
    >
      <div id="conversation-inner" className="hidden" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,166,35,0.18),transparent_38%),linear-gradient(180deg,transparent,rgba(0,0,0,0.58))]" />
      <div className={`relative grid ${agentMode ? "h-screen min-h-[720px] lg:grid-cols-[1fr_1fr]" : "min-h-[760px] lg:grid-cols-[1.05fr_0.95fr]"}`}>
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
            <span>{agentMode ? "Zoom attendee mode" : "IronHeart Runtime"}</span>
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
                  {agentMode
                    ? "Attendee.dev loads this page inside the meeting container. OYA asks for microphone access automatically, connects to IronHeart Runtime, and becomes the live voice layer for the Zoom room."
                    : "This starter prototype reuses IronHeart.AI call infrastructure: SDK loading, live voice connection, dial tone, hangup tone, mute control, and a text endpoint for meeting logic."}
                </p>
              </div>

              <div className="mt-10 space-y-4">
                <button
                  className="w-full rounded-full bg-white px-7 py-5 font-mono text-xs font-black uppercase tracking-[0.2em] text-black transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!sdkReady || runtimeState === "loading"}
                  onClick={startCall}
                  type="button"
                >
                  {runtimeState === "loading" ? "Joining..." : agentMode ? "Start OYA now" : "Call OYA"}
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
