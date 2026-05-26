import { applyToCuratedEvent, approveCuratedApplication, denyCuratedApplication } from "@/lib/event-access";
import { canUseEventApplications } from "@/lib/event-applications";
import {
  applyToCuratedEventServiceSchema,
  approveCuratedApplicationServiceSchema,
  denyCuratedApplicationServiceSchema,
} from "@/lib/validation/store";
import { getEventAccessRepositoryByEventId, saveEventAccessRepository } from "@/lib/db/repositories/access-repository";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http/errors";
import { logInfo } from "@/lib/observability/logger";
import { requireOwnedConsumerUserService, requireOwnedRecruiterEventService } from "@/lib/services/access-service";

export async function applyToCuratedEventService(params: {
  eventId: string;
  userId: string;
}) {
  const nextParams = applyToCuratedEventServiceSchema.parse(params);
  await requireOwnedConsumerUserService(nextParams.userId, "apply to curated events");
  const event = await getEventAccessRepositoryByEventId(nextParams.eventId);

  if (!event) {
    throw notFound("Event not found");
  }

  if (!canUseEventApplications(event)) {
    throw forbidden("Applications are only available for curated events.");
  }

  if (event.applications.some((application) => application.userId === nextParams.userId)) {
    throw conflict("You have already applied to this event.");
  }

  if (event.accessAssignments.some((assignment) => assignment.userId === nextParams.userId)) {
    throw conflict("You already have access assigned for this event.");
  }

  return saveEventAccessRepository(applyToCuratedEvent(event, nextParams.userId));
}

export async function approveCuratedApplicationService(params: {
  eventId: string;
  userId: string;
  accessGroupId: string;
}) {
  const nextParams = approveCuratedApplicationServiceSchema.parse(params);
  const { actor, event } = await requireOwnedRecruiterEventService(nextParams.eventId, "approve applications for");

  if (!canUseEventApplications(event)) {
    throw forbidden("Applications are only available for curated events.");
  }

  const application = event.applications.find((candidate) => candidate.userId === nextParams.userId);
  if (!application) {
    throw notFound("Application not found");
  }

  const accessGroupExists = event.guestlist.accessGroups.some((group) => group.id === nextParams.accessGroupId);
  if (!accessGroupExists) {
    throw badRequest("Access group must belong to this event.");
  }

  const savedEvent = await saveEventAccessRepository(
    approveCuratedApplication(event, {
      userId: nextParams.userId,
      accessGroupId: nextParams.accessGroupId,
      reviewedBy: actor.currentRecruiterProfileId,
    }),
  );
  if (!savedEvent) {
    throw notFound("Approved application event state could not be reloaded after save.");
  }
  logInfo({
    event: "mutation.application_approved",
    message: "Recruiter approved a curated event application.",
    category: "mutation",
    meta: {
      eventId: savedEvent.id,
      recruiterProfileId: actor.currentRecruiterProfileId,
      userId: nextParams.userId,
      accessGroupId: nextParams.accessGroupId,
    },
  });
  return savedEvent;
}

export async function denyCuratedApplicationService(params: {
  eventId: string;
  userId: string;
}) {
  const nextParams = denyCuratedApplicationServiceSchema.parse(params);
  const { actor, event } = await requireOwnedRecruiterEventService(nextParams.eventId, "deny applications for");

  if (!canUseEventApplications(event)) {
    throw forbidden("Applications are only available for curated events.");
  }

  const application = event.applications.find((candidate) => candidate.userId === nextParams.userId);
  if (!application) {
    throw notFound("Application not found");
  }

  const savedEvent = await saveEventAccessRepository(
    denyCuratedApplication(event, {
      userId: nextParams.userId,
      reviewedBy: actor.currentRecruiterProfileId,
    }),
  );
  if (!savedEvent) {
    throw notFound("Denied application event state could not be reloaded after save.");
  }
  logInfo({
    event: "mutation.application_denied",
    message: "Recruiter denied a curated event application.",
    category: "mutation",
    meta: {
      eventId: savedEvent.id,
      recruiterProfileId: actor.currentRecruiterProfileId,
      userId: nextParams.userId,
    },
  });
  return savedEvent;
}
