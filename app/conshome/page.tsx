"use client";

import { HomeFeed } from "@/components/home/home-feed";
import { PublicTopNav } from "@/components/layout/public-top-nav";
import { useAppStore } from "@/lib/app-store";

export default function ConsumerHomePage() {
  const { events, profile } = useAppStore();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <PublicTopNav
        title="Nightlife Ops System"
        subtitle="Clubs, Brands, Collectives"
      />

      <main className="px-4 py-3 md:px-6">
        <div className="mx-auto max-w-7xl space-y-1.5">
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
