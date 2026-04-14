"use client";

import Link from "next/link";
import { EventPoster } from "@/components/home/event-poster";
import { eventCardVariants } from "@/components/office/event-card-variants";
import { formatCompactEventDate } from "@/lib/utils/date";

type OfficeEventCardProps = {
  imageUrl: string;
  imageAlt: string;
  date: string;
  title: string;
  lineupPreview: string;
  location: string;
  venue: string;
  href?: string;
  ariaLabel?: string;
};

export function OfficeEventCard({
  imageUrl,
  imageAlt,
  date,
  title,
  lineupPreview,
  location,
  venue,
  href,
  ariaLabel,
}: OfficeEventCardProps) {
  const styles = eventCardVariants.feed;
  const content = (
    <div className={styles.content}>
      <EventPoster
        imageUrl={imageUrl}
        imageAlt={imageAlt}
        aspectClassName={styles.posterAspect}
      />

      <div className={styles.body}>
        <p className="text-body-sm uppercase tracking-widerish text-muted">
          {date ? formatCompactEventDate(date) : "Date"}
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
            {title || "Event Title"}
          </h3>
          <p
            className={styles.lineup}
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {lineupPreview || "Lineup preview"}
          </p>
        </div>

        <div className={styles.footer}>
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {location || "Location"}
          </span>
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {venue || "Venue"}
          </span>
        </div>
      </div>
    </div>
  );

  const className = styles.container;

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel ?? title} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
