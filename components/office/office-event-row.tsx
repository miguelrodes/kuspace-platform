"use client";

import Link from "next/link";
import type { Event } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import { EventPoster } from "@/components/home/event-poster";
import { formatCompactEventDate } from "@/lib/utils/date";

type OfficeEventRowProps = {
  event: Event;
  recruiter: RecruiterProfile;
};

export function OfficeEventRow({ event, recruiter }: OfficeEventRowProps) {
  const lineupPreview = event.lineup.entries.map((entry) => entry.name).join(", ");

  return (
    <div className="group relative h-full min-h-[17.5rem] overflow-hidden rounded-[var(--radius-surface)] border border-border bg-panel-2 px-2.5 py-2.5 transition hover:border-white/20">
      <Link
        href={`/office/events/${event.id}/edit`}
        aria-label={`Edit ${event.cover.title}`}
        className="absolute inset-0 z-0"
      />

      <div className="relative z-10 flex h-full flex-col gap-3">
        <EventPoster
          imageUrl={event.cover.imageUrl}
          imageAlt={event.cover.imageAlt}
          aspectClassName="aspect-[2.2/1]"
        />

        <div className="flex flex-1 flex-col space-y-1.5">
          <p className="text-body-sm uppercase tracking-widerish text-muted">
            {formatCompactEventDate(event.cover.date)}
          </p>

          <div className="flex min-h-0 flex-1 flex-col">
            <h3
              className="min-h-[2.8rem] overflow-hidden text-body-lg font-medium text-fg"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              }}
            >
              {event.cover.title}
            </h3>
            <p
              className="mt-0 min-h-[2.3rem] overflow-hidden text-body-sm text-muted"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              }}
            >
              {lineupPreview}
            </p>
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-1.5 text-body-sm text-muted">
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {event.cover.location}
            </span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {recruiter.displayName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
