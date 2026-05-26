import type { Event } from "@/types/event";
import { getEventById, saveEventAggregate } from "@/lib/db/store-repository";

export async function getEventAccessRepositoryByEventId(eventId: string) {
  return getEventById(eventId);
}

export async function saveEventAccessRepository(event: Event) {
  return saveEventAggregate(event);
}
