"use client";

import { useMemo, useState } from "react";
import type { Event } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import { EventCard } from "@/components/events/event-card";
import { EventMetaRow } from "@/components/home/event-meta-row";
import { profileEventGridClassName } from "@/components/office/event-card-variants";

type ProfileEventsPanelProps = {
  profile: RecruiterProfile;
  upcomingEvents: Event[];
  pastEvents: Event[];
  audience?: "consumer" | "recruiter";
};

type EventPanelTab = "upcoming" | "past";

export function ProfileEventsPanel({
  profile,
  upcomingEvents,
  pastEvents,
  audience = "recruiter",
}: ProfileEventsPanelProps) {
  const [tab, setTab] = useState<EventPanelTab>("upcoming");

  const visibleEvents = useMemo(
    () => (tab === "upcoming" ? upcomingEvents : pastEvents),
    [pastEvents, tab, upcomingEvents]
  );

  return (
    <div className="space-y-2.5 px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2
          className="relative top-[3px] text-heading-sm uppercase leading-none"
          style={{
            color: "var(--accent-hex)",
            fontFamily: "var(--font-space-grotesk)",
            letterSpacing: "0.06em",
          }}
        >
          Events
        </h2>
        <div className="inline-flex items-end gap-2 self-end">
          {(["upcoming", "past"] as const).map((item, index) => (
            <div key={item} className="inline-flex items-end gap-2">
              {index > 0 ? (
                <span className="relative top-[-2px] block text-sm uppercase tracking-widerish leading-none text-white">
                  |
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setTab(item)}
                className={[
                  "inline-flex items-end rounded-[var(--radius-button-tag)] px-2.5 pb-0 pt-0 text-sm uppercase tracking-widerish leading-none transition",
                  tab === item
                    ? "bg-transparent text-white"
                    : "text-muted hover:text-fg",
                ].join(" ")}
              >
                {item}
              </button>
            </div>
          ))}
        </div>
      </div>

      {visibleEvents.length === 0 ? (
        <p className="text-body-sm text-muted">No events in this section.</p>
      ) : (
        <div className="max-h-[32rem] overflow-y-auto pr-1">
          <div className={profileEventGridClassName}>
            {visibleEvents.map((event, index) => (
              <EventCard
                key={event.id}
                className="profile-content-reveal profile-card-reveal"
                style={{ animationDelay: `${260 + Math.min(index * 65, 260)}ms` }}
                variant="medium"
                imageUrl={event.cover.imageUrl}
                imageAlt={event.cover.imageAlt}
                date={event.cover.date}
                title={event.cover.title}
                lineupPreview={event.lineup.entries.map((entry) => entry.name).join(", ")}
                href={audience === "recruiter" ? `/rec/events/${event.slug}` : `/cons/events/${event.slug}`}
                hrefMode="overlay"
                ariaLabel={`View ${event.cover.title}`}
                footer={
                  <EventMetaRow
                    location={event.cover.location}
                    recruiterName={profile.displayName}
                    recruiterSlug={profile.slug}
                    audience={audience}
                  />
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
