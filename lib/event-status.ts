import type { Event, EventStatus } from "@/types/event";

export function isLockedEventStatus(status: EventStatus) {
  return status === "upcoming" || status === "live" || status === "past";
}

export function isPublicEventStatus(status: EventStatus) {
  return status === "live" || status === "past";
}

export function isInternalPreviewEventStatus(status: EventStatus) {
  return status === "upcoming" || status === "live" || status === "past";
}

export function canConsumerAccessEvent(event: Event) {
  return isPublicEventStatus(event.status);
}

export function canRecruiterAccessEventPreview(event: Event) {
  return isInternalPreviewEventStatus(event.status);
}

export function getPublicEventCollection(events: Event[]) {
  return events.filter((event) => isPublicEventStatus(event.status));
}

