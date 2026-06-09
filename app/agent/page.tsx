import OyaRuntimeDemo from "../../components/OyaRuntimeDemo";

export const metadata = {
  title: "OYA Voice Agent",
  description: "Auto-starting IronHeart.AI voice agent page for attendee.dev meeting containers.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AgentPage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black">
      <OyaRuntimeDemo autoStart agentMode />
    </main>
  );
}
