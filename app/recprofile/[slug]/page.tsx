import { DJNetworkPanel } from "@/components/profile/dj-network-panel";
import { ProfileEventsPanel } from "@/components/profile/profile-events-panel";
import { ProfileHero } from "@/components/profile/profile-hero";
import { ProfileSidebarCard } from "@/components/profile/profile-sidebar-card";
import { ProfileStats } from "@/components/profile/profile-stats";
import { PublicTopNav } from "@/components/layout/public-top-nav";
import { mockRecruiterProfile } from "@/lib/mock-data";

type RecruiterProfilePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function RecruiterProfilePage({
  params,
}: RecruiterProfilePageProps) {
  const { slug } = await params;
  const profile = mockRecruiterProfile;

  if (slug !== profile.slug) {
    return (
      <div className="min-h-screen bg-bg text-fg">
        <PublicTopNav
          title="Nightlife Ops System"
          subtitle="Clubs, Brands, Collectives"
        />

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
      <PublicTopNav
        title="Nightlife Ops System"
        subtitle="Clubs, Brands, Collectives"
      />

      <main className="px-4 py-8 md:px-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="overflow-hidden rounded-[var(--radius-surface)] border border-border bg-panel">
            <ProfileHero profile={profile} />

            <div className="border-t border-border grid xl:grid-cols-[13.5rem_minmax(0,1fr)_14rem]">
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
                  upcomingEvents={profile.events?.upcoming ?? []}
                  pastEvents={profile.events?.past ?? []}
                />
              </div>

              <div className="xl:min-w-0">
                <DJNetworkPanel
                  events={[
                    ...(profile.events?.upcoming ?? []),
                    ...(profile.events?.past ?? []),
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
