"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GlobalSearchOverlay } from "@/components/layout/global-search-overlay";
import { getPublicEventCollection } from "@/lib/event-status";
import { cn } from "@/lib/utils/index";
import { useMockEventsStore } from "@/lib/mock-store";

type PublicTopNavProps = {
  title?: string;
  subtitle?: string;
};

export function PublicTopNav({
  title = "Nightlife Office",
  subtitle = "Public Event Network",
}: PublicTopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { events, profile } = useMockEventsStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navItems = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/" || pathname.startsWith("/events") || pathname.startsWith("/cons/events"),
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
  ];

  const handleNavigate = (href: string) => {
    setIsSearchOpen(false);
    router.push(href);
  };

  const labels = Array.from(
    new Map(
      events
        .flatMap((event) => event.labels ?? [])
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
  );

  return (
    <header className="border-b border-border bg-panel px-4 pb-2 pt-3 md:px-6">
      <div className="mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-2 md:items-end">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="Go to home">
            <img src="/favicon.ico" alt="" className="h-10 w-10 shrink-0" aria-hidden="true" />
          </Link>
          <Link
            href="/"
            className="text-title tracking-[0.14em] transition hover:opacity-90"
            style={{ fontFamily: "var(--font-space-grotesk)", color: "#FFFFFF", fontWeight: 400 }}
          >
            KUSPACE
          </Link>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 pt-0 md:w-auto md:flex-nowrap md:gap-5 md:pt-1.5 md:pr-0">
          <nav
            aria-label="Public navigation"
            className="ml-5 flex items-center gap-7 text-subheading text-muted md:ml-4 md:gap-8"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={item.active ? { color: "#FFFFFF" } : undefined}
                className={cn(
                  "text-subheading uppercase tracking-widerish transition hover:text-fg",
                  item.active ? "text-fg" : "text-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="relative ml-1 translate-y-[2px]">
            <button
              type="button"
              aria-label="Search events and recruiters"
              onClick={() => setIsSearchOpen((current) => !current)}
              className="inline-flex items-center justify-center text-muted transition hover:text-fg"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-5 w-5"
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
        events={getPublicEventCollection(events)}
        nightclubs={[
          {
            id: profile.id,
            name: profile.displayName,
            slug: profile.slug,
            avatarImageUrl: profile.media?.avatarImageUrl,
          },
        ]}
        labels={labels}
        eventHrefFor={(event) => `/cons/events/${event.slug}`}
        nightclubHrefFor={(nightclub) => `/cons/profile/${nightclub.slug}`}
        onNavigate={handleNavigate}
      />
    </header>
  );
}
