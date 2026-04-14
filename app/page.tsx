"use client";

import { HomeFeed } from "@/components/home/home-feed";
import { PublicTopNav } from "@/components/layout/public-top-nav";
import { useMockEventsStore } from "@/lib/mock-store";

export default function HomePage() {
  const { events, profile } = useMockEventsStore();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <PublicTopNav
        title="Nightlife Ops System"
        subtitle="Clubs, Brands, Collectives"
      />

      <main className="px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl space-y-2">
          <header className="space-y-1">
            <h1
              className="text-heading uppercase"
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
            events={events}
            recruiter={profile}
            audience="consumer"
          />
        </div>
      </main>
    </div>
  );
}
