"use client";

import { useClerk } from "@clerk/nextjs";
import { useMemo, useState, useSyncExternalStore } from "react";
import { DJNetworkPanel } from "@/components/profile/dj-network-panel";
import { ProfileEventsPanel } from "@/components/profile/profile-events-panel";
import { ProfileHero } from "@/components/profile/profile-hero";
import { ProfileSidebarCard } from "@/components/profile/profile-sidebar-card";
import { ProfileStats } from "@/components/profile/profile-stats";
import { PublicTopNav } from "@/components/layout/public-top-nav";
import { RecruiterTopNav } from "@/components/layout/recruiter-top-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicEventCollection } from "@/lib/event-status";
import { useAppStore } from "@/lib/app-store";

function RecruiterSettingsModal({
  onClose,
  onEditProfile,
  onSignOut,
}: {
  onClose: () => void;
  onEditProfile: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-[var(--radius-surface)] border border-border bg-panel p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-subheading uppercase tracking-[0.12em] text-[var(--accent-hex)]">
              Settings
            </h2>
            <p className="text-body text-muted">
              Account-level actions for the recruiter profile.
            </p>
          </div>

          <div className="space-y-2 border-t border-border pt-5">
            <h3 className="text-body uppercase tracking-widerish text-fg">Account Actions</h3>
            <button
              type="button"
              className="block text-body text-fg transition hover:text-[var(--accent-hex)]"
              onClick={onEditProfile}
            >
              Edit Profile
            </button>
            <button
              type="button"
              className="block text-body text-fg transition hover:text-[var(--accent-hex)]"
              onClick={onSignOut}
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type RecruiterProfilePageViewProps = {
  slug: string;
  audience?: "consumer" | "recruiter";
};

export function RecruiterProfilePageView({
  slug,
  audience = "recruiter",
}: RecruiterProfilePageViewProps) {
  const { signOut } = useClerk();
  const { profile: activeProfile, recruiters, updateProfile } = useAppStore();
  const profile = recruiters.find((candidate) => candidate.slug === slug) ??
    (activeProfile.slug === slug ? activeProfile : null);
  const canManageProfile = Boolean(
    audience === "recruiter" &&
      profile &&
      profile.id === activeProfile.id &&
      profile.organizationId === activeProfile.organizationId,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const publicUpcomingEvents = useMemo(
    () =>
      getPublicEventCollection(profile?.events?.upcoming ?? []).filter(
        (event) => event.status === "live" || event.status === "upcoming",
      ),
    [profile?.events?.upcoming],
  );
  const publicPastEvents = useMemo(
    () => getPublicEventCollection(profile?.events?.past ?? []),
    [profile?.events?.past],
  );
  const visibleUpcomingEvents = useMemo(
    () => (audience === "consumer" ? publicUpcomingEvents : (profile?.events?.upcoming ?? [])),
    [audience, profile?.events?.upcoming, publicUpcomingEvents],
  );
  const visiblePastEvents = useMemo(
    () => (audience === "consumer" ? publicPastEvents : (profile?.events?.past ?? [])),
    [audience, profile?.events?.past, publicPastEvents],
  );

  if (!hasHydrated || !activeProfile.id) {
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

  if (!profile) {
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
        <div className="mx-auto grid max-w-[88rem] grid-cols-[minmax(0,1fr)_minmax(0,72rem)_minmax(0,1fr)] items-start">
          <div />

          <div className="relative">
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
                  {isEditing && canManageProfile ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="text-body uppercase tracking-widerish text-fg">Display Name</label>
                        <Input
                          value={profile.displayName}
                          className="mt-1 text-body text-white/72"
                          onChange={(event) =>
                            updateProfile({
                              displayName: event.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="text-body uppercase tracking-widerish text-fg">Real Name</label>
                        <Input
                          value={profile.realName ?? ""}
                          className="mt-1 text-body text-white/72"
                          onChange={(event) =>
                            updateProfile({
                              realName: event.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="text-body uppercase tracking-widerish text-fg">Location</label>
                        <Input
                          value={profile.location?.displayText ?? ""}
                          className="mt-1 text-body text-white/72"
                          onChange={(event) =>
                            updateProfile({
                              location: { displayText: event.target.value },
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="text-body uppercase tracking-widerish text-fg">Website</label>
                        <Input
                          value={profile.links?.website ?? ""}
                          className="mt-1 text-body text-white/72"
                          onChange={(event) =>
                            updateProfile({
                              links: {
                                ...profile.links,
                                website: event.target.value,
                              },
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="text-body uppercase tracking-widerish text-fg">Email</label>
                        <Input
                          value={profile.links?.email ?? ""}
                          className="mt-1 text-body text-white/72"
                          onChange={(event) =>
                            updateProfile({
                              links: {
                                ...profile.links,
                                email: event.target.value,
                              },
                            })
                          }
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-body uppercase tracking-widerish text-fg">Bio</label>
                        <textarea
                          value={profile.bio ?? ""}
                          className="mt-1 min-h-[8rem] w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-2 text-body text-white/72 outline-none"
                          onChange={(event) =>
                            updateProfile({
                              bio: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-body text-fg">{profile.bio}</p>
                  )}
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

          {canManageProfile ? (
            <div className="flex items-start justify-start pl-4 pt-0">
              <Button
                type="button"
                variant="ghost"
                className="h-10 px-0 text-[13px] uppercase tracking-[0.16em] !text-[var(--accent-hex)] hover:bg-transparent hover:!text-[var(--accent-hex)]/85"
                onClick={() => setSettingsOpen(true)}
                style={{ color: "var(--accent-hex)" }}
              >
                Settings
              </Button>
            </div>
          ) : null}
        </div>
      </main>

      {settingsOpen ? (
        <RecruiterSettingsModal
          onClose={() => setSettingsOpen(false)}
          onEditProfile={() => {
            setSettingsOpen(false);
            setIsEditing(true);
          }}
          onSignOut={() => {
            void signOut({ redirectUrl: "/" });
          }}
        />
      ) : null}
    </div>
  );
}
