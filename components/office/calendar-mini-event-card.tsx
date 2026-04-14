"use client";

import Link from "next/link";
import type { Event } from "@/types/event";
import { cn } from "@/lib/utils/index";
import { eventCardVariants } from "@/components/office/event-card-variants";

function getStatusCardClass(status: Event["status"]) {
  if (status === "live") {
    return "border-white/10";
  }

  if (status === "upcoming") {
    return "border-white/15";
  }

  if (status === "draft") {
    return "border-dashed border-white/10 opacity-65";
  }

  if (status === "past") {
    return "border-white/10 opacity-65";
  }

  return "border-white/10";
}

type CalendarMiniEventCardProps = {
  event: Event;
  compact?: boolean;
  href: string;
  onNavigate?: () => void;
};

export function CalendarMiniEventCard({
  event,
  compact = false,
  href,
  onNavigate,
}: CalendarMiniEventCardProps) {
  const styles = eventCardVariants.compact;

  return (
    <Link
      href={href}
      onClick={(eventClick) => {
        eventClick.stopPropagation();
        onNavigate?.();
      }}
      style={
        event.status === "live"
          ? { borderColor: "hsla(223,100%,52%,0.98)" }
          : undefined
      }
      className={cn(styles.container, getStatusCardClass(event.status))}
    >
      <div className={cn("overflow-hidden", compact ? styles.compactPosterAspect : styles.defaultPosterAspect)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.cover.imageUrl}
          alt={event.cover.imageAlt}
          className="h-full w-full object-cover"
        />
      </div>

      <div className={compact ? styles.compactBody : styles.defaultBody}>
        <p className={compact ? styles.compactTitle : styles.defaultTitle}>
          {event.cover.title}
        </p>
        <p
          className={compact ? styles.compactMeta : styles.defaultMeta}
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 1,
          }}
        >
          {event.cover.location}
        </p>
      </div>
    </Link>
  );
}
