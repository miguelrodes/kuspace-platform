import Link from "next/link";
import type { Event } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import { formatCompactEventDate } from "@/lib/utils/date";
import { Card } from "@/components/ui/card";
import { EventMetaRow } from "@/components/home/event-meta-row";
import { EventPoster } from "@/components/home/event-poster";

type EventFeedCardProps = {
  event: Event;
  recruiter: RecruiterProfile;
};

export function EventFeedCard({ event, recruiter }: EventFeedCardProps) {
  const lineupPreview = event.lineup.entries.map((entry) => entry.name).join(", ");

  return (
    <Card className="group relative h-full min-h-[26rem] overflow-hidden px-3 py-3 transition hover:border-white/20">
      <Link
        href={`/events/${event.slug}`}
        aria-label={`View ${event.cover.title}`}
        className="absolute inset-0 z-0"
      />

      <div className="relative z-10 flex h-full flex-col gap-3">
        <EventPoster
          imageUrl={event.cover.imageUrl}
          imageAlt={event.cover.imageAlt}
        />

        <div className="flex flex-1 flex-col space-y-2">
          <p className="text-body-sm uppercase tracking-widerish text-muted">
            {formatCompactEventDate(event.cover.date)}
          </p>

          <div className="flex min-h-0 flex-1 flex-col">
            <h2
              className="min-h-[3.75rem] overflow-hidden text-heading font-semibold tracking-tightish text-fg"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              }}
            >
              {event.cover.title}
            </h2>
            <p
              className="mt-1 min-h-[2.9rem] overflow-hidden text-body text-muted"
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
    </Card>
  );
}
