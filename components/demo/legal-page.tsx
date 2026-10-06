import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-bg px-4 py-10 text-fg md:px-6 md:py-14">
      <article className="mx-auto max-w-3xl space-y-9 text-body leading-7 text-fg/85">
        <header className="space-y-2 border-b border-border pb-6">
          <h1 className="text-title font-semibold text-fg" style={{ fontFamily: "var(--font-space-grotesk)" }}>{title}</h1>
          <p className="text-body-sm text-muted">Last updated: 6 October 2026</p>
        </header>
        {children}
      </article>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-subheading font-medium text-fg">{title}</h2>
      {children}
    </section>
  );
}
