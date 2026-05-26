import { requireConsumerActor, requireOrganizationMember, requireRecruiterActor } from "@/lib/auth/actor";
import { assertConsumerOwnsUser, assertOrganizationOwnsEvent } from "@/lib/auth/permissions";
import { notFound } from "@/lib/http/errors";
import { getConsumerRepositoryById } from "@/lib/db/repositories/consumer-repository";
import { getEventRepositoryById } from "@/lib/db/repositories/event-repository";
import { getRecruiterRepositoryById, getRecruiterRepositoryByOrganizationId } from "@/lib/db/repositories/recruiter-repository";

export async function requireOwnedRecruiterEventService(eventId: string, action: string) {
  const { actor } = await requireOrganizationMember();
  const event = await getEventRepositoryById(eventId);

  if (!event) {
    throw notFound("Event not found");
  }

  assertOrganizationOwnsEvent(event, actor.currentOrganizationId, action);

  return {
    actor,
    event,
  };
}

export async function requireOwnedConsumerUserService(userId: string, action: string) {
  const actor = await requireConsumerActor();
  assertConsumerOwnsUser(actor.currentConsumerUserId, userId, action);

  const user = await getConsumerRepositoryById(userId);
  if (!user) {
    throw notFound("Consumer user not found");
  }

  return {
    actor,
    user,
  };
}

export async function requireCurrentRecruiterProfileService() {
  const actor = await requireRecruiterActor();
  const profile = actor.currentOrganizationId
    ? await getRecruiterRepositoryByOrganizationId(actor.currentOrganizationId)
    : await getRecruiterRepositoryById(actor.currentRecruiterProfileId);

  if (!profile) {
    throw notFound("Recruiter profile not found");
  }

  return {
    actor,
    profile,
  };
}
