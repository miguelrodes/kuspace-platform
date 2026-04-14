import type { Event } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import { OfficeEventCard } from "@/components/office/office-event-card";

type EventFeedCardProps = {
  event: Event;
  recruiter: RecruiterProfile;
  audience?: "consumer" | "recruiter";
};

export function EventFeedCard({
  event,
  recruiter,
  audience = "consumer",
}: EventFeedCardProps) {
  const lineupPreview = event.lineup.entries.map((entry) => entry.name).join(", ");
  const eventHref =
    audience === "recruiter" ? `/rec/events/${event.slug}` : `/cons/events/${event.slug}`;

  return (
    <OfficeEventCard
      imageUrl={event.cover.imageUrl}
      imageAlt={event.cover.imageAlt}
      date={event.cover.date}
      title={event.cover.title}
      lineupPreview={lineupPreview}
      location={event.cover.location}
      venue={event.cover.venue || recruiter.displayName}
      href={eventHref}
      ariaLabel={`View ${event.cover.title}`}
    />
  );
}
