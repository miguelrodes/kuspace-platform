"use client";

import { HomeFeed } from "@/components/home/home-feed";
import { RecruiterTopNav } from "@/components/layout/recruiter-top-nav";
import { useAppStore } from "@/lib/app-store";

export default function RecruiterHomePage() {
  const { discoveryEvents, profile, recruiters } = useAppStore();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <RecruiterTopNav />

      <main className="px-4 py-3 md:px-6">
        <div className="mx-auto max-w-7xl space-y-1.5">
          <header className="space-y-0.5">
            <h1
              className="text-heading !font-normal uppercase"
              style={{
                color: "var(--accent-hex)",
                fontFamily: "var(--font-space-grotesk)",
                letterSpacing: "0.06em",
              }}
            >
              Events
            </h1>
          </header>

          <HomeFeed
            events={discoveryEvents}
            recruiter={profile}
            recruiters={recruiters}
            audience="recruiter"
          />
        </div>
      </main>
    </div>
  );
}
