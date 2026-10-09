"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GlobalSearchOverlay } from "@/components/layout/global-search-overlay";
import { MutationErrorBanner } from "@/components/ui/mutation-error-banner";
import { resolveEventLabels } from "@/lib/event-labels";
import { getPublicEventCollection } from "@/lib/event-status";
import { cn } from "@/lib/utils/index";
import { useAppStore } from "@/lib/app-store";
import { useHeaderEntrance } from "@/components/layout/use-header-entrance";

type PublicTopNavProps = {
  title?: string;
  subtitle?: string;
};

export function PublicTopNav({
  title = "Nightlife Office",
  subtitle = "Public Event Network",
}: PublicTopNavProps) {
  const pathname = usePathname();
  const headerRef = useHeaderEntrance(pathname, "/conshome");
  const router = useRouter();
  const { events, profile, mutationError, clearMutationError } = useAppStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navItems = useMemo(
    () => [
      {
        href: "/conshome",
        label: "Home",
        active: pathname === "/conshome" || pathname.startsWith("/events") || pathname.startsWith("/cons/events"),
      },
      {
        href: "/cons/tickets",
        label: "Tickets",
        active: pathname === "/tickets" || pathname.startsWith("/cons/tickets"),
      },
      {
        href: "/cons/profile/me",
        label: "Profile",
        active:
          pathname === "/consprofile" ||
          pathname === "/cons/profile/me",
      },
    ],
    [pathname],
  );

  const handleNavigate = (href: string) => {
    setIsSearchOpen(false);
    router.push(href);
  };

  const publicEvents = useMemo(() => getPublicEventCollection(events), [events]);
  const labels = useMemo(
    () =>
      Array.from(
        new Map(
          events
            .flatMap((event) => resolveEventLabels(event, profile))
            .map((label) => [
              label.id,
              {
                id: label.id,
                name: label.name,
                avatarImageUrl: label.avatarImageUrl,
                href: label.profileSlug ? `/cons/profile/${label.profileSlug}` : undefined,
              },
            ]),
        ).values(),
      ),
    [events, profile],
  );
  const nightclubs = useMemo(
    () => [
      {
        id: profile.id,
        name: profile.displayName,
        slug: profile.slug,
        avatarImageUrl: profile.media?.avatarImageUrl,
      },
    ],
    [profile.displayName, profile.id, profile.media?.avatarImageUrl, profile.slug],
  );

  return (
    <header ref={headerRef} className="site-header-divider bg-panel px-4 pb-4 pt-4 md:px-6 md:pb-3">
      <div className="site-header-content mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-2 md:items-end">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="Go to home">
            <img src="/favicon.ico" alt="" className="h-10 w-10 shrink-0" aria-hidden="true" />
          </Link>
          <Link href="/" aria-label="Go to home" className="ml-1 shrink-0 transition hover:opacity-90">
            <img
              src="/title-logo.svg"
              alt="KUSPACE"
              className="block h-10 w-auto translate-y-[3px]"
            />
          </Link>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 pt-0 md:w-auto md:flex-nowrap md:gap-5 md:pt-1.5 md:pr-0">
          <nav
            aria-label="Public navigation"
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
              aria-label="Search events and recruiters"
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
        eventHrefFor={(event) => `/cons/events/${event.slug}`}
        nightclubHrefFor={(nightclub) => `/cons/profile/${nightclub.slug}`}
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
