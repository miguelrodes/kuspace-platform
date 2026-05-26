import { createDraftEventSeed } from "@/lib/event-draft";
import { forbidden, notFound } from "@/lib/http/errors";
import { assertDraftEventDeletionAllowed } from "@/lib/auth/permissions";
import { isLockedEventStatus } from "@/lib/event-status";
import { logInfo } from "@/lib/observability/logger";
import {
  createDraftEventRequestSchema,
  eventUpdateSchema,
  eventStatusTransitionSchema,
  type CreateDraftEventRequestInput,
  type EventInput,
} from "@/lib/validation/store";
import { deleteEventRepositoryAggregate, saveEventRepositoryAggregate } from "@/lib/db/repositories/event-repository";
import { requireCurrentRecruiterProfileService, requireOwnedRecruiterEventService } from "@/lib/services/access-service";

function canTransitionEventStatus(from: EventInput["status"], to: EventInput["status"]) {
  if (from === to) {
    return true;
  }

  if (to === "cancelled") {
    return from === "draft" || from === "upcoming" || from === "live";
  }

  return (
    (from === "draft" && to === "upcoming") ||
    (from === "upcoming" && to === "draft") ||
    (from === "upcoming" && to === "live") ||
    (from === "live" && to === "past")
  );
}

export async function createEventService(event: CreateDraftEventRequestInput = {}) {
  const payload = createDraftEventRequestSchema.parse(event);
  const { actor, profile } = await requireCurrentRecruiterProfileService();

  if (!actor.currentOrganizationId) {
    throw forbidden("Create a recruiter workspace before creating events.");
  }

  const overrides: Partial<EventInput> = {
    organizationId: actor.currentOrganizationId,
    recruiterProfileId: profile.id,
    status: payload.status ?? "draft",
    admissionMode: payload.admissionMode ?? "public",
    ...(payload.slug ? { slug: payload.slug } : {}),
    ...(payload.cover ? { cover: payload.cover as EventInput["cover"] } : {}),
    ...(payload.lineup ? { lineup: payload.lineup as EventInput["lineup"] } : {}),
    ...(payload.timetable ? { timetable: payload.timetable as EventInput["timetable"] } : {}),
    ...(payload.guestlist ? { guestlist: payload.guestlist as EventInput["guestlist"] } : {}),
    ...(payload.accessAssignments ? { accessAssignments: payload.accessAssignments } : {}),
    ...(payload.applications ? { applications: payload.applications } : {}),
    ...(payload.budget ? { budget: payload.budget as EventInput["budget"] } : {}),
    ...(payload.tickets ? { tickets: payload.tickets as EventInput["tickets"] } : {}),
    ...(payload.labels ? { labels: payload.labels } : {}),
  };
  const nextEvent = createDraftEventSeed(overrides);

  if (nextEvent.recruiterProfileId !== profile.id || nextEvent.organizationId !== actor.currentOrganizationId) {
    throw forbidden("You can only create events for your current organization workspace.");
  }

  const savedEvent = await saveEventRepositoryAggregate(nextEvent);
  if (!savedEvent) {
    throw notFound("Created event could not be reloaded after save.");
  }
  logInfo({
    event: "mutation.event_created",
    message: "Recruiter created a new event.",
    category: "mutation",
    meta: {
      eventId: savedEvent.id,
      recruiterProfileId: profile.id,
      status: savedEvent.status,
      slug: savedEvent.slug,
    },
  });
  return savedEvent;
}

export async function updateEventService(id: string, event: EventInput) {
  const nextEvent = eventUpdateSchema.parse({ ...event, id });
  const existing = await requireOwnedRecruiterEventService(id, "update");
  const { profile } = await requireCurrentRecruiterProfileService();

  if (isLockedEventStatus(existing.event.status)) {
    throw forbidden("Locked events cannot be edited through the standard update path.");
  }

  if (nextEvent.recruiterProfileId !== profile.id) {
    throw forbidden("You can only update events for the recruiter profile in your current organization.");
  }

  if (nextEvent.organizationId !== existing.actor.currentOrganizationId) {
    throw forbidden("You can only update events for your current organization workspace.");
  }

  if (!canTransitionEventStatus(existing.event.status, nextEvent.status)) {
    throw forbidden("This event status transition is not allowed.");
  }

  const savedEvent = await saveEventRepositoryAggregate(nextEvent);
  if (!savedEvent) {
    throw notFound("Updated event could not be reloaded after save.");
  }
  logInfo({
    event: "mutation.event_updated",
    message: "Recruiter updated an event.",
    category: "mutation",
    meta: {
      eventId: savedEvent.id,
      recruiterProfileId: existing.actor.currentRecruiterProfileId,
      status: savedEvent.status,
      slug: savedEvent.slug,
    },
  });
  return savedEvent;
}

export async function deleteEventService(id: string) {
  const { actor, event } = await requireOwnedRecruiterEventService(id, "delete");
  assertDraftEventDeletionAllowed(event);
  await deleteEventRepositoryAggregate(id);
  logInfo({
    event: "mutation.event_deleted",
    message: "Recruiter deleted a draft event.",
    category: "mutation",
    meta: {
      eventId: event.id,
      recruiterProfileId: actor.currentRecruiterProfileId,
      status: event.status,
      slug: event.slug,
    },
  });
  return { ok: true };
}

export async function transitionEventStatusService(id: string, status: EventInput["status"]) {
  const nextStatus = eventStatusTransitionSchema.parse({ status }).status;
  const { event } = await requireOwnedRecruiterEventService(id, "transition");

  if (!canTransitionEventStatus(event.status, nextStatus)) {
    throw forbidden("This event status transition is not allowed.");
  }

  return saveEventRepositoryAggregate({
    ...event,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  });
}
