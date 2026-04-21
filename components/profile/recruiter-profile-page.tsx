"use client";

import { useSyncExternalStore } from "react";
import { DJNetworkPanel } from "@/components/profile/dj-network-panel";
import { ProfileEventsPanel } from "@/components/profile/profile-events-panel";
import { ProfileHero } from "@/components/profile/profile-hero";
import { ProfileSidebarCard } from "@/components/profile/profile-sidebar-card";
import { ProfileStats } from "@/components/profile/profile-stats";
import { PublicTopNav } from "@/components/layout/public-top-nav";
import { RecruiterTopNav } from "@/components/layout/recruiter-top-nav";
import { getPublicEventCollection } from "@/lib/event-status";
import { useMockEventsStore } from "@/lib/mock-store";

type RecruiterProfilePageViewProps = {
  slug: string;
  audience?: "consumer" | "recruiter";
};

export function RecruiterProfilePageView({
  slug,
  audience = "recruiter",
}: RecruiterProfilePageViewProps) {
  const { profile } = useMockEventsStore();
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!hasHydrated || !profile.slug) {
    return (
      <div className="min-h-screen bg-bg text-fg">
        {audience === "recruiter" ? <RecruiterTopNav /> : <PublicTopNav title="Nightlife Ops System" subtitle="Clubs, Brands, Collectives" />}

        <main className="px-4 py-8 md:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-body text-muted">Loading profile…</p>
          </div>
        </main>
      </div>
    );
  }

  const publicUpcomingEvents = getPublicEventCollection(profile.events?.upcoming ?? []).filter(
    (event) => event.status === "live",
  );
  const publicPastEvents = getPublicEventCollection(profile.events?.past ?? []);
  const visibleUpcomingEvents =
    audience === "consumer" ? publicUpcomingEvents : (profile.events?.upcoming ?? []);
  const visiblePastEvents =
    audience === "consumer" ? publicPastEvents : (profile.events?.past ?? []);

  if (slug !== profile.slug) {
    return (
      <div className="min-h-screen bg-bg text-fg">
        {audience === "recruiter" ? (
          <RecruiterTopNav />
        ) : (
          <PublicTopNav
            title="Nightlife Ops System"
            subtitle="Clubs, Brands, Collectives"
          />
        )}

        <main className="px-4 py-8 md:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-body text-muted">Profile not found.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      {audience === "recruiter" ? (
        <RecruiterTopNav />
      ) : (
        <PublicTopNav
          title="Nightlife Ops System"
          subtitle="Clubs, Brands, Collectives"
        />
      )}

      <main className="px-4 py-8 md:px-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="overflow-hidden rounded-[var(--radius-surface)] border border-border bg-panel">
            <ProfileHero profile={profile} />

            <div className="grid xl:grid-cols-[13.5rem_minmax(0,1fr)_14rem] border-t border-border">
              <div className="xl:border-r xl:border-border">
                <ProfileSidebarCard>
                  <ProfileStats profile={profile} />
                </ProfileSidebarCard>
              </div>

              <div className="min-w-0 xl:border-r xl:border-border">
                <div className="px-4 py-4">
                  <p className="text-body text-fg">{profile.bio}</p>
                </div>

                <ProfileEventsPanel
                  profile={profile}
                  upcomingEvents={visibleUpcomingEvents}
                  pastEvents={visiblePastEvents}
                  audience={audience}
                />
              </div>

              <div className="xl:min-w-0">
                <DJNetworkPanel
                  events={[
                    ...visibleUpcomingEvents,
                    ...visiblePastEvents,
                  ]}
                />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
