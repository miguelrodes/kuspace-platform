import { HomeFeed } from "@/components/home/home-feed";
import { PublicTopNav } from "@/components/layout/public-top-nav";
import { mockEvents, mockRecruiterProfile } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <PublicTopNav
        title="Nightlife Ops System"
        subtitle="Clubs, Brands, Collectives"
      />

      <main className="px-4 py-8 md:px-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <header className="space-y-1">
            <h1
              className="text-heading uppercase tracking-[0.2em]"
              style={{ color: "var(--accent-hex)" }}
            >
              Events
            </h1>
          </header>

          <HomeFeed events={mockEvents} recruiter={mockRecruiterProfile} />
        </div>
      </main>
    </div>
  );
}
