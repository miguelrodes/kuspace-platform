import type { Event } from "@/types/event";
import { getEventById, saveEventAggregate } from "@/lib/db/store-repository";

export async function getEventTicketRepositoryByEventId(eventId: string) {
  return getEventById(eventId);
}

export async function saveEventTicketRepository(event: Event) {
  return saveEventAggregate(event);
}
