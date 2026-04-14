"use client";

import Link from "next/link";
import type { Event } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import { EventPoster } from "@/components/home/event-poster";
import { EventMetaRow } from "@/components/home/event-meta-row";
import { eventCardVariants } from "@/components/office/event-card-variants";
import { formatCompactEventDate } from "@/lib/utils/date";

type ProfileEventCardProps = {
  event: Event;
  recruiter: RecruiterProfile;
  audience: "consumer" | "recruiter";
};

export function ProfileEventCard({
  event,
  recruiter,
  audience,
}: ProfileEventCardProps) {
  const styles = eventCardVariants.profile;
  const lineupPreview = event.lineup.entries.map((entry) => entry.name).join(", ");
  const eventHref =
    audience === "recruiter" ? `/rec/events/${event.slug}` : `/cons/events/${event.slug}`;

  return (
    <div className={styles.container}>
      <Link
        href={eventHref}
        aria-label={`View ${event.cover.title}`}
        className="absolute inset-0 z-0"
      />

      <div className={styles.content}>
        <EventPoster
          imageUrl={event.cover.imageUrl}
          imageAlt={event.cover.imageAlt}
          aspectClassName={styles.posterAspect}
        />

        <div className={styles.body}>
          <p className="text-body-sm uppercase tracking-widerish text-muted">
            {formatCompactEventDate(event.cover.date)}
          </p>

          <div className="flex min-h-0 flex-1 flex-col">
            <h3
              className={styles.title}
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              }}
            >
              {event.cover.title}
            </h3>
            <p
              className={styles.lineup}
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              }}
            >
              {lineupPreview}
            </p>
          </div>

          <div className={styles.footer}>
            <EventMetaRow
              location={event.cover.location}
              recruiterName={recruiter.displayName}
              recruiterSlug={recruiter.slug}
              audience={audience}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
