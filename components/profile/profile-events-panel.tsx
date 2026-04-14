"use client";

import { useMemo, useState } from "react";
import type { Event } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import { ProfileEventCard } from "@/components/profile/profile-event-card";

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
          className="relative top-[3px] text-heading uppercase leading-none"
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
                <span className="relative top-[-2px] block text-lg uppercase tracking-widerish leading-none text-white">
                  |
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setTab(item)}
                className={[
                  "inline-flex items-end rounded-[var(--radius-button-tag)] px-2.5 pb-0 pt-0 text-lg uppercase tracking-widerish leading-none transition",
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleEvents.map((event) => (
              <ProfileEventCard
                key={event.id}
                event={event}
                recruiter={profile}
                audience={audience}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
