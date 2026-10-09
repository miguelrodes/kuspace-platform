"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DJNetworkPanel } from "@/components/profile/dj-network-panel";
import { ProfileEventsPanel } from "@/components/profile/profile-events-panel";
import { ProfileHero } from "@/components/profile/profile-hero";
import { ProfileSidebarCard } from "@/components/profile/profile-sidebar-card";
import { ProfileStats } from "@/components/profile/profile-stats";
import { PublicTopNav } from "@/components/layout/public-top-nav";
import { RecruiterTopNav } from "@/components/layout/recruiter-top-nav";
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
  const router = useRouter();
  const {
    profile: activeProfile,
    recruiters,
    updateProfile,
    switchOrganization,
  } = useAppStore();
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
  const [settingsNotice, setSettingsNotice] = useState("");
  const [switchingPerspective, setSwitchingPerspective] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
  }, []);
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDemoMode = hasHydrated && document.documentElement.dataset.publicDemo === "true";
  const perspectiveOrder = ["space-ibiza", "dc10-ibiza"];
  const demoPerspectives = recruiters
    .filter((candidate) => perspectiveOrder.includes(candidate.slug))
    .sort(
      (left, right) =>
        perspectiveOrder.indexOf(left.slug) - perspectiveOrder.indexOf(right.slug),
    );
  const showDemoPerspectiveSwitcher =
    canManageProfile && isDemoMode && demoPerspectives.length > 1;

  async function handlePerspectiveChange(nextProfile: (typeof demoPerspectives)[number]) {
    if (switchingPerspective || !nextProfile.organizationId) return;
    setSwitchingPerspective(true);
    const changed =
      nextProfile.organizationId === activeProfile.organizationId ||
      (await switchOrganization(nextProfile.organizationId));
    if (changed) router.push(`/recprofile/${nextProfile.slug}`);
    setSwitchingPerspective(false);
  }

  function handleSettingsClick() {
    if (!isDemoMode) {
      setSettingsOpen(true);
      return;
    }
    setSettingsOpen(false);
    setIsEditing(false);
    setSettingsNotice("Not available in demo mode.");
    if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => {
      setSettingsNotice("");
      noticeTimer.current = null;
    }, 2000);
  }
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
        <div className={`mx-auto ${showDemoPerspectiveSwitcher ? "max-w-[86rem]" : "max-w-[72rem]"}`}>
          <div className={showDemoPerspectiveSwitcher ? "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]" : "w-full"}>
          <section key={profile.id} className="overflow-hidden rounded-[var(--radius-surface)] border border-border bg-panel">
            <ProfileHero
              profile={profile}
              onSettingsClick={canManageProfile ? handleSettingsClick : undefined}
              settingsNotice={settingsNotice}
            />

            <div className="grid border-t border-border xl:grid-cols-[13.5rem_minmax(0,1fr)_14rem]">
              <div className="xl:border-r xl:border-border">
                <ProfileSidebarCard>
                  <ProfileStats profile={profile} />
                </ProfileSidebarCard>
              </div>

              <div className="min-w-0 xl:border-r xl:border-border">
                <div className="px-4 py-4">
                  {isEditing && canManageProfile && !isDemoMode ? (
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
                    <p className="profile-content-reveal profile-bio-reveal text-body text-fg">{profile.bio}</p>
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
          {showDemoPerspectiveSwitcher ? (
            <aside className="flex flex-col items-start gap-2 pt-1">
              <span className="text-xs text-muted">Demo Perspective:</span>
              <div
                role="group"
                aria-label="Switch recruiter demo perspective"
                className="flex flex-col items-start gap-2 text-sm uppercase tracking-widerish"
              >
                {demoPerspectives.map((candidate) => {
                  const isActive = candidate.organizationId === activeProfile.organizationId;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      aria-pressed={isActive}
                      disabled={switchingPerspective}
                      onClick={() => void handlePerspectiveChange(candidate)}
                      className={`transition disabled:opacity-50 ${
                        isActive ? "text-fg" : "text-muted hover:text-fg"
                      }`}
                    >
                      {candidate.displayName}
                    </button>
                  );
                })}
              </div>
            </aside>
          ) : null}
          </div>
        </div>
      </main>

      {settingsOpen && !isDemoMode ? (
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
