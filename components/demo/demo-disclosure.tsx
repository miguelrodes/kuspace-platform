export function DemoDisclosure() {
  return (
    <aside
      aria-label="Demo data disclosure"
      className="fixed right-3 bottom-3 z-[60] max-w-[min(36rem,calc(100vw-1.5rem))] rounded-[var(--radius-surface)] border border-white/10 bg-black/85 px-3 py-2 text-[0.68rem] leading-4 tracking-[0.04em] text-white/65 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur"
    >
      Demo environment — all organizations, artists, events, attendees, and
      transactions are fictional.
    </aside>
  );
}
