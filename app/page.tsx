import Image from "next/image";
import OyaRuntimeDemo from "../components/OyaRuntimeDemo";
import AttendeeJoinForm from "../components/AttendeeJoinForm";
import CheckoutButton from "../components/CheckoutButton";

const moments = [
  {
    eyebrow: "Before the meeting",
    title: "OYA receives the room context.",
    body: "Participants, agenda, company notes, previous decisions, and relevant knowledge are loaded before the call starts.",
  },
  {
    eyebrow: "During the meeting",
    title: "OYA listens like a participant.",
    body: "The runtime tracks unresolved topics, speaker intent, deadlocks, and moments where a short verbal intervention would help.",
  },
  {
    eyebrow: "After the meeting",
    title: "OYA publishes structured memory.",
    body: "Summaries become decisions, owners, follow-ups, objections, and reusable context for the next conversation.",
  },
];

const layers = ["voice", "memory", "context", "orchestration", "knowledge", "decision support"];

const pricingPlans = [
  {
    name: "Starter",
    price: "$25",
    cadence: "per month",
    priceId: process.env.STRIPE_PRICE_AI_DIGITAL_EMPLOYEE_25 || "price_1TgT1dJWfiRe8nsJtfOuPtGf",
    description: "For solo founders and small teams testing OYA in real meetings.",
    features: ["Live meeting copilot", "Voice runtime access", "Meeting notes workflow", "Zoom bot checkout"],
    cta: "Start with OYA",
  },
  {
    name: "Growth",
    price: "$100",
    cadence: "per month",
    priceId: process.env.STRIPE_PRICE_AI_DIGITAL_EMPLOYEE_100 || "price_1TgT1dJWfiRe8nsJz7WaUht2",
    description: "For teams that want an AI Digital Employee in recurring operational meetings.",
    features: ["Everything in Starter", "Priority runtime capacity", "Search-assisted meeting context", "Team workflow support"],
    cta: "Choose Growth",
    featured: true,
  },
  {
    name: "Scale",
    price: "$900",
    cadence: "per month",
    priceId: process.env.STRIPE_PRICE_AI_DIGITAL_EMPLOYEE_900 || "price_1TgT1dJWfiRe8nsJdahm4yWj",
    description: "For companies building voice-first meeting operations on IronHeart runtime.",
    features: ["Everything in Growth", "Enterprise deployment path", "Runtime integration support", "Custom meeting workflows"],
    cta: "Deploy at Scale",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-7 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between gap-6 text-[11px] uppercase tracking-[0.22em] text-iron-muted">
          <span className="inline-flex items-center gap-3">
            <Image src="/assets/ironheart-logo.jpg" alt="IronHeart.AI" width={30} height={30} className="rounded-full" />
            IronHeart.AI Runtime
          </span>
          <span className="hidden sm:inline">Human-Computer Interface</span>
        </header>

        <div className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="mb-6 inline-flex border border-iron-green/30 bg-iron-green/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-iron-green">
              Hackathon prototype
            </p>
            <h1 className="text-[clamp(5.5rem,17vw,13rem)] font-semibold leading-[0.78] tracking-[-0.09em]">
              OYA
            </h1>
            <h2 className="mt-7 max-w-3xl text-[clamp(2.5rem,6.5vw,6.6rem)] font-light leading-[0.9] tracking-[-0.06em]">
              AI Digital Employee for live meetings.
            </h2>
            <p className="mt-8 max-w-2xl text-xl font-light leading-8 text-iron-muted sm:text-2xl sm:leading-10">
              OYA joins your meetings, listens, speaks, remembers, and summarizes in real time.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                className="rounded-full bg-iron-red px-7 py-4 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[0_18px_60px_rgba(255,54,54,0.25)] transition hover:-translate-y-1"
                href="#zoom"
              >
                Connect Zoom
              </a>
              <a
                className="rounded-full border border-white/15 bg-white/[0.06] px-7 py-4 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/10"
                href="#story"
              >
                See story
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 bg-[radial-gradient(circle,rgba(61,223,143,0.18),transparent_60%)] blur-2xl" />
            <OyaRuntimeDemo />
          </div>
        </div>
      </section>

      <AttendeeJoinForm />

      <section className="mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-12" id="pricing">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-iron-green">
              AI Digital Employee
            </p>
            <h2 className="mt-5 max-w-2xl text-5xl font-light leading-none tracking-[-0.06em] sm:text-7xl">
              Subscribe to OYA.
            </h2>
          </div>
          <p className="max-w-3xl text-xl font-light leading-9 text-iron-muted">
            Choose a monthly plan for OYA, the meeting-native AI Digital Employee powered by
            IronHeart.AI Runtime. Checkout is handled securely by Stripe.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              className={`relative min-h-[520px] overflow-hidden border p-6 sm:p-8 ${
                plan.featured
                  ? "border-iron-green/45 bg-iron-green/[0.09] shadow-[0_0_80px_rgba(61,223,143,0.12)]"
                  : "border-white/10 bg-white/[0.035]"
              }`}
              key={plan.name}
            >
              {plan.featured ? (
                <div className="absolute right-5 top-5 border border-iron-green/40 bg-iron-green/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-iron-green">
                  Recommended
                </div>
              ) : null}
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-iron-muted">{plan.name}</p>
              <div className="mt-10 flex items-end gap-3">
                <span className="text-7xl font-light leading-none tracking-[-0.08em]">{plan.price}</span>
                <span className="pb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-iron-muted">
                  {plan.cadence}
                </span>
              </div>
              <p className="mt-7 min-h-[84px] text-base leading-7 text-iron-muted">{plan.description}</p>
              <div className="mt-8 h-px bg-white/10" />
              <ul className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <li className="flex gap-3 text-sm leading-6 text-iron-paper/85" key={feature}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-iron-green shadow-[0_0_16px_rgba(61,223,143,0.8)]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <CheckoutButton
                className={`absolute bottom-6 left-6 right-6 rounded-full px-6 py-4 font-mono text-xs font-semibold uppercase tracking-[0.16em] transition disabled:cursor-wait disabled:opacity-70 sm:bottom-8 sm:left-8 sm:right-8 ${
                  plan.featured
                    ? "bg-iron-green text-black hover:-translate-y-1"
                    : "border border-white/15 bg-white/[0.06] text-white hover:bg-white/10"
                }`}
                planName={plan.name}
                priceId={plan.priceId}
              >
                {plan.cta}
              </CheckoutButton>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-24 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-12" id="story">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-iron-green">Paradigm shift</p>
          <h2 className="mt-5 max-w-2xl text-5xl font-light leading-none tracking-[-0.06em] sm:text-7xl">
            Human to screen to computer is becoming too slow.
          </h2>
        </div>
        <div className="space-y-8 text-xl leading-9 text-iron-muted">
          <p>
            IronHeart.AI is building the runtime layer between humans and computers. Voice is only one
            interface. The same system can operate through earbuds, glasses, robots, smartphones,
            vehicles, AR interfaces, and intelligent devices.
          </p>
          <p>
            OYA is the meeting-room expression of that thesis: a persona that can enter a conversation,
            understand context, speak at the right moment, and turn discussion into reusable memory.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {layers.map((layer) => (
              <div className="border border-white/10 bg-white/[0.035] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-iron-paper/80" key={layer}>
                {layer}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-28 sm:px-10 lg:px-12">
        <div className="grid gap-4 lg:grid-cols-3">
          {moments.map((moment, index) => (
            <article className="min-h-[360px] border border-white/10 bg-white/[0.035] p-6 sm:p-8" key={moment.title}>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-iron-green">
                0{index + 1} / {moment.eyebrow}
              </p>
              <h3 className="mt-16 text-3xl font-light leading-tight tracking-[-0.04em]">{moment.title}</h3>
              <p className="mt-5 text-base leading-7 text-iron-muted">{moment.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-10 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-iron-muted">
        Powered by IronHeart.AI Runtime Infrastructure for Physical AI
      </footer>
    </main>
  );
}
