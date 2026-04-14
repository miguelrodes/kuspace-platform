"use client";

import { Tag } from "@/components/ui/tag";
import type { EventStatus } from "@/types/event";

type EventStatusBadgeProps = {
  status: EventStatus;
};

const statusLabelMap: Record<Extract<EventStatus, "draft" | "live" | "upcoming" | "past">, string> = {
  draft: "Draft",
  live: "Live",
  upcoming: "Upcoming",
  past: "Past",
};

const statusToneMap = {
  draft: "draft",
  live: "published",
  upcoming: "neutral",
  past: "past",
} as const;

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  if (status === "cancelled") {
    return null;
  }

  return (
    <Tag tone={statusToneMap[status]}>
      {statusLabelMap[status]}
    </Tag>
  );
}
