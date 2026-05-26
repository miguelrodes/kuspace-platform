import { conflict, notFound } from "@/lib/http/errors";
import type { ConsumerProfileUpdateInput } from "@/lib/validation/store";
import { consumerProfileUpdateSchema } from "@/lib/validation/store";
import { saveConsumerRepository } from "@/lib/db/repositories/consumer-repository";
import { requireOwnedConsumerUserService } from "@/lib/services/access-service";
import { getEventRepositoryBySlug } from "@/lib/db/repositories/event-repository";

export async function updateConsumerUserService(id: string, user: ConsumerProfileUpdateInput) {
  const nextUser = consumerProfileUpdateSchema.parse({ ...user, id });
  await requireOwnedConsumerUserService(id, "update preferences");
  await requireOwnedConsumerUserService(nextUser.id, "update preferences");
  return saveConsumerRepository(nextUser);
}

export async function saveConsumerEventService(userId: string, eventSlug: string) {
  const { user } = await requireOwnedConsumerUserService(userId, "save events for");
  const event = await getEventRepositoryBySlug(eventSlug);

  if (!event) {
    throw notFound("Event not found");
  }

  if ((user.savedEventSlugs ?? []).includes(eventSlug)) {
    throw conflict("Event is already saved.");
  }

  return saveConsumerRepository({
    ...user,
    savedEventSlugs: [...(user.savedEventSlugs ?? []), eventSlug],
  });
}

export async function unsaveConsumerEventService(userId: string, eventSlug: string) {
  const { user } = await requireOwnedConsumerUserService(userId, "unsave events for");
  const event = await getEventRepositoryBySlug(eventSlug);

  if (!event) {
    throw notFound("Event not found");
  }

  return saveConsumerRepository({
    ...user,
    savedEventSlugs: (user.savedEventSlugs ?? []).filter((slug) => slug !== eventSlug),
  });
}
