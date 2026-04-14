"use client";

import type { Event } from "@/types/event";
import { OfficeEventCard } from "@/components/office/office-event-card";

type OfficeEventRowProps = {
  event: Event;
};

export function OfficeEventRow({ event }: OfficeEventRowProps) {
  const lineupPreview = event.lineup.entries.map((entry) => entry.name).join(", ");

  return (
    <OfficeEventCard
      imageUrl={event.cover.imageUrl}
      imageAlt={event.cover.imageAlt}
      date={event.cover.date}
      title={event.cover.title}
      lineupPreview={lineupPreview}
      location={event.cover.location}
      venue={event.cover.venue}
      href={`/office/event-editor/${event.id}`}
      ariaLabel={`Edit ${event.cover.title}`}
    />
  );
}
