import type { ConsumerUser } from "@/types/user";
import type { Event } from "@/types/event";
import { isPublicEventStatus } from "@/lib/event-status";
import { forbidden } from "@/lib/http/errors";
import { logWarn } from "@/lib/observability/logger";

export function getPublicReadableEvents(events: Event[]) {
  return events.filter((event) => isPublicEventStatus(event.status));
}

export function getRecruiterOwnedEvents(events: Event[], recruiterProfileId: string) {
  return events.filter((event) => event.recruiterProfileId === recruiterProfileId);
}

export function getOrganizationScopedEvents(events: Event[], organizationId: string) {
  return events.filter((event) => event.organizationId === organizationId);
}

export function getConsumersRelatedToEvents(users: ConsumerUser[], events: Event[]) {
  const visibleUserIds = new Set<string>();

  for (const event of events) {
    for (const assignment of event.accessAssignments) {
      visibleUserIds.add(assignment.userId);
    }

    for (const application of event.applications) {
      visibleUserIds.add(application.userId);
    }

    for (const entry of event.guestlist.entries) {
      if (entry.source === "user") {
        visibleUserIds.add(entry.userId);
        continue;
      }

      if (entry.userId) {
        visibleUserIds.add(entry.userId);
      }
    }
  }

  return users.filter((user) => visibleUserIds.has(user.id));
}

export function assertRecruiterOwnsEvent(event: Event, recruiterProfileId: string, action: string) {
  if (event.recruiterProfileId !== recruiterProfileId) {
    logWarn({
      event: "authorization.recruiter_event_ownership_denied",
      message: "Recruiter attempted to mutate an event they do not own.",
      category: "authorization",
      meta: {
        action,
        eventId: event.id,
        actorRecruiterProfileId: recruiterProfileId,
        ownerRecruiterProfileId: event.recruiterProfileId,
      },
    });
    throw forbidden(`You can only ${action} events for your own recruiter profile.`);
  }
}

export function assertOrganizationOwnsEvent(event: Event, organizationId: string, action: string) {
  if (event.organizationId !== organizationId) {
    logWarn({
      event: "authorization.organization_event_ownership_denied",
      message: "Recruiter attempted to mutate an event outside their current organization.",
      category: "authorization",
      meta: {
        action,
        eventId: event.id,
        actorOrganizationId: organizationId,
        ownerOrganizationId: event.organizationId,
      },
    });
    throw forbidden(`You can only ${action} events for your current organization.`);
  }
}

export function assertDraftEventDeletionAllowed(event: Event) {
  if (event.status !== "draft") {
    throw forbidden("Only draft events can be deleted.");
  }
}

export function assertConsumerOwnsUser(currentConsumerUserId: string, targetUserId: string, action: string) {
  if (currentConsumerUserId !== targetUserId) {
    logWarn({
      event: "authorization.consumer_ownership_denied",
      message: "Consumer attempted to mutate another consumer profile.",
      category: "authorization",
      meta: {
        action,
        actorConsumerUserId: currentConsumerUserId,
        targetUserId,
      },
    });
    throw forbidden(`You can only ${action} for your own consumer profile.`);
  }
}
