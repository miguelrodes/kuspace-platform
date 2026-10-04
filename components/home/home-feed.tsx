"use client";

import { useMemo, useState } from "react";
import type { Event } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import { EventCard } from "@/components/events/event-card";
import Link from "next/link";
import {
  FilterBar,
  type DateFilter,
  type HomeStatusFilter,
} from "@/components/home/filter-bar";
import { getPublicEventCollection } from "@/lib/event-status";

type HomeFeedProps = {
  events: Event[];
  recruiter: RecruiterProfile;
  recruiters?: RecruiterProfile[];
  audience?: "consumer" | "recruiter";
};

function matchesDateFilter(event: Event, dateFilter: DateFilter) {
  if (dateFilter === "all") {
    return true;
  }

  const day = Number(event.cover.date.slice(-2));

  if (dateFilter === "early-month") {
    return day >= 1 && day <= 10;
  }

  if (dateFilter === "mid-month") {
    return day >= 11 && day <= 20;
  }

  return day >= 21 && day <= 31;
}

export function HomeFeed({
  events,
  recruiter,
  recruiters = [],
  audience = "consumer",
}: HomeFeedProps) {
  const [status, setStatus] = useState<HomeStatusFilter>("upcoming");
  const [date, setDate] = useState<DateFilter>("all");

  const visibleEvents = useMemo(() => {
    const targetStatus = status === "upcoming" ? ["live", "upcoming"] : ["past"];
    const sourceEvents = audience === "consumer" ? getPublicEventCollection(events) : events;

    return sourceEvents.filter(
      (event) =>
        targetStatus.includes(event.status) &&
        matchesDateFilter(event, date)
    ).sort((left, right) =>
      status === "upcoming"
        ? left.cover.date.localeCompare(right.cover.date)
        : right.cover.date.localeCompare(left.cover.date),
    );
  }, [audience, date, events, status]);

  return (
    <div className="space-y-1">
      <FilterBar
        status={status}
        date={date}
        onStatusChange={setStatus}
        onDateChange={setDate}
      />

      {visibleEvents.length === 0 ? (
        <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-4 py-6">
          <p className="text-body text-muted">
            No events match these filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleEvents.map((event) => {
            const eventRecruiter = recruiters.find((candidate) => candidate.id === event.recruiterProfileId);
            return (
            <EventCard
              key={event.id}
              variant="large"
              imageUrl={event.cover.imageUrl}
              imageAlt={event.cover.imageAlt}
              date={event.cover.date}
              title={event.cover.title}
              lineupPreview={event.lineup.entries.map((entry) => entry.name).join(", ")}
              href={audience === "recruiter" ? `/rec/events/${event.slug}` : `/cons/events/${event.slug}`}
              hrefMode={audience === "recruiter" ? "overlay" : "wrap"}
              ariaLabel={`View ${event.cover.title}`}
              footer={
                <>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {event.cover.location || "Location"}
                  </span>
                  {audience === "recruiter" && eventRecruiter ? (
                    <Link
                      className="relative z-10 overflow-hidden text-ellipsis whitespace-nowrap underline-offset-2 hover:underline"
                      href={`/recprofile/${eventRecruiter.slug}`}
                      onClick={(clickEvent) => clickEvent.stopPropagation()}
                    >
                      {eventRecruiter.displayName}
                    </Link>
                  ) : (
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {event.cover.venue || recruiter.displayName}
                    </span>
                  )}
                </>
              }
            />
            );
          })}
        </div>
      )}
    </div>
  );
}
