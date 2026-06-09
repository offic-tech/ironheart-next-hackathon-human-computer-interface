const runtimeSurfaces = [
  "earbuds",
  "glasses",
  "robots",
  "smartphones",
  "vehicles",
  "AR interfaces",
  "intelligent devices",
];

const capabilities = [
  "joins meetings",
  "introduces participants",
  "presents the agenda",
  "listens continuously",
  "tracks discussion context",
  "identifies unresolved topics",
  "assists during deadlocks",
  "provides verbal summaries",
  "publishes structured meeting notes",
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between gap-6 text-[11px] uppercase tracking-[0.22em] text-iron-muted">
          <span>IronHeart.AI Runtime</span>
          <span className="hidden sm:inline">Human-Computer Interface</span>
        </header>

        <div className="grid items-end gap-12 py-20 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="mb-5 inline-flex border border-iron-green/30 bg-iron-green/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-iron-green">
              Hackathon Project
            </p>
            <h1 className="max-w-4xl text-[clamp(5rem,16vw,13rem)] font-semibold leading-[0.78] tracking-[-0.08em]">
              OYA
            </h1>
            <h2 className="mt-6 max-w-3xl text-[clamp(2.3rem,6vw,6.2rem)] font-light leading-[0.92] tracking-[-0.05em]">
              AI Meeting Copilot
            </h2>
            <p className="mt-8 max-w-3xl text-xl font-light leading-8 text-iron-muted sm:text-2xl sm:leading-10">
              The first AI participant that joins your meetings, listens,
              speaks, remembers, and summarizes in real time.
            </p>
            <button className="mt-10 border border-iron-red bg-iron-red px-7 py-4 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[0_18px_60px_rgba(255,54,54,0.25)] transition hover:-translate-y-1">
              Coming Soon
            </button>
          </div>

          <aside className="border border-white/10 bg-white/[0.045] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.48)] backdrop-blur">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-iron-green">
              Future Paradigm
            </p>
            <div className="mt-8 space-y-5 text-2xl font-light leading-tight">
              <div className="text-iron-muted">Human</div>
              <div className="font-mono text-sm uppercase tracking-[0.18em] text-iron-green">
                IronHeart Runtime
              </div>
              <div className="text-iron-muted">Computer</div>
            </div>
            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="text-sm leading-6 text-iron-muted">
                Voice is only one interface. The same runtime can operate
                through physical and ambient devices.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {runtimeSurfaces.map((surface) => (
                  <span
                    key={surface}
                    className="border border-white/10 bg-black/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-iron-paper/80"
                  >
                    {surface}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <section className="grid gap-4 border-t border-white/10 pt-8 md:grid-cols-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-iron-green">
              Runtime
            </p>
            <p className="mt-3 text-sm leading-6 text-iron-muted">
              Memory, context, orchestration, voice interaction, knowledge
              retrieval, and decision support.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="grid gap-2 sm:grid-cols-3">
              {capabilities.map((capability) => (
                <div
                  key={capability}
                  className="border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-iron-paper/80"
                >
                  {capability}
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="pt-10 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-iron-muted">
          Powered by IronHeart.AI Runtime Infrastructure for Physical AI
        </footer>
      </section>
    </main>
  );
}
