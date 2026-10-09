"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { EventPoster } from "@/components/home/event-poster";
import {
  eventCardVariants,
  type EventCardVariant,
} from "@/components/office/event-card-variants";
import { formatCompactEventDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/index";

type EventCardProps = {
  variant: Exclude<EventCardVariant, "compact">;
  imageUrl: string;
  imageAlt: string;
  date: string;
  title: string;
  lineupPreview: string;
  href?: string;
  ariaLabel?: string;
  topRightSlot?: React.ReactNode;
  footer?: React.ReactNode;
  hrefMode?: "wrap" | "overlay";
  className?: string;
  style?: CSSProperties;
};

const twoLineClampStyle = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical" as const,
  WebkitLineClamp: 2,
};

export function EventCard({
  variant,
  imageUrl,
  imageAlt,
  date,
  title,
  lineupPreview,
  href,
  ariaLabel,
  topRightSlot,
  footer,
  hrefMode = "wrap",
  className,
  style,
}: EventCardProps) {
  const styles = eventCardVariants[variant];
  const useOverlayLink = hrefMode === "overlay" && Boolean(href);
  const textStackClassName =
    variant === "large" ? "flex min-h-0 flex-1 flex-col" : "flex min-h-0 flex-col";

  const content = (
    <>
      {useOverlayLink && href ? (
        <Link
          href={href}
          aria-label={ariaLabel ?? title}
          className="absolute inset-0 z-0"
        />
      ) : null}

      <div
        className={`relative ${styles.content} ${useOverlayLink ? "pointer-events-none" : ""}`}
      >
        {topRightSlot ? (
          <div className="pointer-events-auto absolute right-2 top-2 z-10">
            {topRightSlot}
          </div>
        ) : null}
        <EventPoster imageUrl={imageUrl} imageAlt={imageAlt} aspectClassName={styles.posterAspect} />

        <div className={styles.body}>
          <p className="text-body-sm uppercase tracking-widerish text-muted">
            {date ? formatCompactEventDate(date) : "Date"}
          </p>

          <div className={textStackClassName}>
            <h3
              className={styles.title}
              style={variant === "large" ? twoLineClampStyle : undefined}
              title={title || "Event Title"}
            >
              {title || "Event Title"}
            </h3>
            <p
              className={styles.lineup}
              style={twoLineClampStyle}
              title={lineupPreview || "Lineup preview"}
            >
              {lineupPreview || "Lineup preview"}
            </p>
          </div>

          {footer ? (
            <div className={`${styles.footer} ${useOverlayLink ? "pointer-events-auto" : ""}`}>
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  if (href && hrefMode === "wrap") {
    return (
      <Link href={href} aria-label={ariaLabel ?? title} className={cn(styles.container, className)} style={style}>
        {content}
      </Link>
    );
  }

  return <div className={cn(styles.container, className)} style={style}>{content}</div>;
}
