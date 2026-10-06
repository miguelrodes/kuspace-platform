"use client";

import Link from "next/link";
import { startTransition, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GlobalSearchOverlay } from "@/components/layout/global-search-overlay";
import { MutationErrorBanner } from "@/components/ui/mutation-error-banner";
import { resolveEventLabels } from "@/lib/event-labels";
import { getPublicEventCollection } from "@/lib/event-status";
import { cn } from "@/lib/utils/index";
import { useAppStore } from "@/lib/app-store";

type RecruiterTopNavProps = {
  title?: string;
  subtitle?: string;
};

export function RecruiterTopNav({
  title = "Nightlife Ops System",
  subtitle = "Clubs, Labels, Collectives",
}: RecruiterTopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    discoveryEvents,
    profile,
    recruiters,
    currentOrganization,
    currentOrganizationId,
    organizations = [],
    mutationError,
    clearMutationError,
    switchOrganization,
  } = useAppStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);
  const [pendingOrganizationId, setPendingOrganizationId] = useState<string | null>(null);
  const selectedOrganizationId =
    pendingOrganizationId ?? currentOrganizationId ?? "";

  const navItems = useMemo(
    () => [
      {
        href: "/rechome",
        label: "Home",
        active: pathname === "/rechome",
      },
      {
        href: "/office",
        label: "Office",
        active: pathname.startsWith("/office"),
      },
      {
        href: profile.slug ? `/recprofile/${profile.slug}` : "/recprofile",
        label: "Profile",
        active: pathname.startsWith("/recprofile"),
      },
    ],
    [pathname, profile.slug],
  );

  const handleNavigate = (href: string) => {
    setIsSearchOpen(false);
    router.push(href);
  };

  const handleWorkspaceChange = async (organizationId: string) => {
    setPendingOrganizationId(organizationId);
    setIsSwitchingWorkspace(true);
    const switched = await switchOrganization(organizationId);
    setIsSwitchingWorkspace(false);
    setPendingOrganizationId(null);

    if (!switched) {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  };

  const publicEvents = useMemo(
    () => getPublicEventCollection(discoveryEvents),
    [discoveryEvents],
  );
  const labels = useMemo(
    () =>
      Array.from(
        new Map(
          discoveryEvents
            .flatMap((event) => {
              const owner = recruiters.find((candidate) => candidate.id === event.recruiterProfileId) ?? profile;
              return resolveEventLabels(event, owner);
            })
            .map((label) => [
              label.id,
              {
                id: label.id,
                name: label.name,
                avatarImageUrl: label.avatarImageUrl,
                href: label.profileSlug ? `/recprofile/${label.profileSlug}` : undefined,
              },
            ]),
        ).values(),
      ),
    [discoveryEvents, profile, recruiters],
  );
  const nightclubs = useMemo(
    () => recruiters.map((recruiter) => ({
      id: recruiter.id,
      name: recruiter.displayName,
      slug: recruiter.slug,
      avatarImageUrl: recruiter.media?.avatarImageUrl,
    })),
    [recruiters],
  );

  return (
    <header className="border-b border-border bg-panel px-4 pb-2 pt-3 md:px-6">
      <div className="mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-2 md:items-end">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/rechome" aria-label="Go to home">
            <img src="/favicon.ico" alt="" className="h-10 w-10 shrink-0" aria-hidden="true" />
          </Link>
          <div className="flex min-w-0 items-end gap-3">
            <Link href="/rechome" aria-label="Go to home" className="ml-1 shrink-0 transition hover:opacity-90">
              <img
                src="/title-logo.svg"
                alt="KUSPACE"
                className="block h-10 w-auto translate-y-[3px]"
              />
            </Link>
            {currentOrganization && organizations.length > 1 ? (
              <div className="min-w-0 space-y-0.5 pb-0.5">
                <select
                  value={selectedOrganizationId}
                  onChange={(event) => void handleWorkspaceChange(event.target.value)}
                  disabled={isSwitchingWorkspace}
                  className="max-w-[14rem] border-0 bg-transparent p-0 text-body text-fg outline-none"
                  aria-label="Switch workspace"
                >
                  {organizations.map((membership) => (
                    <option
                      key={membership.organization.id}
                      value={membership.organization.id}
                      className="bg-panel text-fg"
                    >
                      {membership.organization.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 pt-0 md:w-auto md:flex-nowrap md:gap-5 md:pt-1.5 md:pr-0">
          <nav
            aria-label="Recruiter navigation"
            className="ml-5 flex translate-y-[6px] items-center gap-7 text-base text-muted md:ml-4 md:gap-8"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={item.active ? { color: "#FFFFFF" } : undefined}
                className={cn(
                  "text-base uppercase tracking-widerish transition hover:text-fg",
                  item.active ? "text-fg" : "text-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="relative ml-1 translate-y-[6px]">
            <button
              type="button"
              aria-label="Search events and artists"
              onClick={() => setIsSearchOpen((current) => !current)}
              className="inline-flex items-center justify-center text-muted transition hover:text-fg"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-5 w-5 translate-y-[2px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="M13 13L17 17" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <GlobalSearchOverlay
        open={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        events={publicEvents}
        nightclubs={nightclubs}
        labels={labels}
        eventHrefFor={(event) => `/rec/events/${event.slug}`}
        nightclubHrefFor={(nightclub) => `/recprofile/${nightclub.slug}`}
        onNavigate={handleNavigate}
      />
      {mutationError ? (
        <MutationErrorBanner
          message={mutationError.message}
          onDismiss={clearMutationError}
        />
      ) : null}
    </header>
  );
}
