"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Event } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import { EventPoster } from "@/components/home/event-poster";
import { EventMetaRow } from "@/components/home/event-meta-row";
import { formatCompactEventDate } from "@/lib/utils/date";

type ProfileEventsPanelProps = {
  profile: RecruiterProfile;
  upcomingEvents: Event[];
  pastEvents: Event[];
};

type EventPanelTab = "upcoming" | "past";

function CompactEventCard({
  event,
  recruiter,
}: {
  event: Event;
  recruiter: RecruiterProfile;
}) {
  const lineupPreview = event.lineup.entries.map((entry) => entry.name).join(", ");

  return (
    <div className="group relative h-full min-h-[20rem] overflow-hidden rounded-[var(--radius-surface)] border border-border bg-panel-2 px-3 py-3 transition hover:border-white/20">
      <Link
        href={`/events/${event.slug}`}
        aria-label={`View ${event.cover.title}`}
        className="absolute inset-0 z-0"
      />

      <div className="relative z-10 flex h-full flex-col gap-3">
        <EventPoster
          imageUrl={event.cover.imageUrl}
          imageAlt={event.cover.imageAlt}
          aspectClassName="aspect-[2/1]"
        />

        <div className="flex flex-1 flex-col space-y-2">
          <p className="text-body-sm uppercase tracking-widerish text-muted">
            {formatCompactEventDate(event.cover.date)}
          </p>

          <div className="flex min-h-0 flex-1 flex-col">
            <h3
              className="min-h-[3.2rem] overflow-hidden text-body-lg font-medium text-fg"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              }}
            >
              {event.cover.title}
            </h3>
            <p
              className="mt-1 min-h-[2.6rem] overflow-hidden text-body-sm text-muted"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              }}
            >
              {lineupPreview}
            </p>
          </div>

          <div className="mt-auto pt-2">
            <EventMetaRow
              location={event.cover.location}
              recruiterName={recruiter.displayName}
              recruiterSlug={recruiter.slug}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileEventsPanel({
  profile,
  upcomingEvents,
  pastEvents,
}: ProfileEventsPanelProps) {
  const [tab, setTab] = useState<EventPanelTab>("upcoming");

  const visibleEvents = useMemo(
    () => (tab === "upcoming" ? upcomingEvents : pastEvents),
    [pastEvents, tab, upcomingEvents]
  );

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          className="text-heading uppercase tracking-tightish"
          style={{ color: "var(--accent-hex)" }}
        >
          Events
        </h2>
        <div className="inline-flex overflow-hidden rounded-[var(--radius-button-tag)] border border-white/10">
          {(["upcoming", "past"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={[
                "min-w-[7.5rem] px-3 py-1 text-center text-body-sm uppercase tracking-widerish transition",
                tab === item
                  ? "bg-[var(--accent-hex)] text-white"
                  : "bg-transparent text-muted hover:text-fg",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {visibleEvents.length === 0 ? (
        <p className="text-body-sm text-muted">No events in this section.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleEvents.map((event) => (
            <CompactEventCard
              key={event.id}
              event={event}
              recruiter={profile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
