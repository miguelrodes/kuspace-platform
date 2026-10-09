import { isPublicDemoMode } from "@/lib/demo-mode";
import { DemoEntry } from "@/components/demo/demo-entry";

export default function HomePage() {
  const demoMode = isPublicDemoMode();
  return (
    <main className="min-h-screen bg-bg px-4 py-8 text-fg md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <section className="w-full max-w-4xl rounded-[var(--radius-surface)] border border-border bg-panel px-6 pb-5 pt-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:px-10 md:pb-8 md:pt-11">
          <div className="space-y-6">
            <div className="space-y-2">
              <p
                className="text-heading text-white"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                Welcome to
              </p>
              <div className="flex justify-center">
                <div className="flex items-center gap-4 md:gap-5">
                  <img
                    src="/favicon.ico"
                    alt=""
                    aria-hidden="true"
                    className="h-18 w-18 shrink-0 rounded-full -translate-y-[9px] md:h-20 md:w-20"
                  />
                <img
                  src="/title-logo.svg"
                  alt="KUSPACE"
                  className="block h-24 w-auto md:h-28"
                />
                </div>
              </div>
            </div>

            <p className="mx-auto max-w-2xl text-body text-muted">
              {demoMode
                ? "Explore both sides of KUSPACE: manage events through Space Ibiza's workspace or discover nights out as clubgoer Luca Dea. This portfolio demo combines historical event listings with fictional attendee, ticket and budget data. No account required. Your edits stay in your own demo session."
                : "Enter as a consumer to discover events and manage tickets, or create an account with a role that matches how you want to use the platform."}
            </p>

            <div className="flex translate-y-[4px] flex-col items-center justify-center gap-1.5 pt-2">
              {demoMode ? <DemoEntry /> : <>
              <a
                href="/select-role?flow=signup"
                className="inline-flex h-11 min-w-[12rem] items-center justify-center rounded-[var(--radius-button-tag)] px-5 text-body uppercase tracking-[0.08em] transition hover:opacity-80"
                style={{ color: "var(--accent-hex)" }}
              >
                Create an Account
              </a>
              <a
                href="/login"
                className="inline-flex h-11 min-w-[12rem] items-center justify-center rounded-[var(--radius-button-tag)] px-5 text-body uppercase tracking-[0.08em] text-fg transition hover:opacity-80"
              >
                Sign In
              </a>
              </>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
