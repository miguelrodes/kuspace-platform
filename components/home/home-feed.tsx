"use client";

import { useMemo, useState } from "react";
import type { Event } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import { EventFeedCard } from "@/components/home/event-feed-card";
import {
  FilterBar,
  type DateFilter,
  type HomeStatusFilter,
} from "@/components/home/filter-bar";
import { getPublicEventCollection } from "@/lib/event-status";

type HomeFeedProps = {
  events: Event[];
  recruiter: RecruiterProfile;
  audience?: "consumer" | "recruiter";
};

function matchesDateFilter(event: Event, dateFilter: DateFilter) {
  if (dateFilter === "all") {
    return true;
  }

  const day = Number(event.cover.date.slice(-2));

  if (dateFilter === "sep-1-10") {
    return day >= 1 && day <= 10;
  }

  if (dateFilter === "sep-11-20") {
    return day >= 11 && day <= 20;
  }

  return day >= 21 && day <= 30;
}

export function HomeFeed({
  events,
  recruiter,
  audience = "consumer",
}: HomeFeedProps) {
  const [status, setStatus] = useState<HomeStatusFilter>("upcoming");
  const [date, setDate] = useState<DateFilter>("all");

  const visibleEvents = useMemo(() => {
    const targetStatus = status === "upcoming" ? "live" : "past";
    const sourceEvents = audience === "consumer" ? getPublicEventCollection(events) : events;

    return sourceEvents.filter(
      (event) =>
        event.status === targetStatus &&
        matchesDateFilter(event, date)
    );
  }, [audience, date, events, status]);

  return (
    <div className="space-y-2">
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
          {visibleEvents.map((event) => (
            <EventFeedCard
              key={event.id}
              event={event}
              recruiter={recruiter}
              audience={audience}
            />
          ))}
        </div>
      )}
    </div>
  );
}
