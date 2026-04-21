import type { Event, EventApplication, EventApplicationStatus } from "@/types/event";

export function isCuratedEvent(event: Pick<Event, "admissionMode">) {
  return event.admissionMode === "curated";
}

export function canUseEventApplications(event: Pick<Event, "admissionMode">) {
  return isCuratedEvent(event);
}

export function canAcceptedApplicationCreateAssignment(
  application?: Pick<EventApplication, "status">,
) {
  return application?.status === "accepted";
}

export function buildEventApplicationRecord(params: {
  eventId: string;
  userId: string;
  status: EventApplicationStatus;
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  accessGroupId?: string;
  notes?: string;
}): EventApplication {
  return {
    eventId: params.eventId,
    userId: params.userId,
    status: params.status,
    appliedAt: params.appliedAt,
    reviewedAt: params.reviewedAt,
    reviewedBy: params.reviewedBy,
    accessGroupId: params.accessGroupId,
    notes: params.notes,
  };
}
