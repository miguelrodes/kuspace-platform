import type { Event } from "@/types/event";
import {
  deleteEventAggregate,
  getAllEvents,
  getEventsByOrganizationId,
  getEventById,
  getEventBySlug,
  getPublicEvents,
  saveEventAggregate,
} from "@/lib/db/store-repository";

export async function getEventRepositoryById(id: string) {
  return getEventById(id);
}

export async function saveEventRepositoryAggregate(event: Event) {
  return saveEventAggregate(event);
}

export async function deleteEventRepositoryAggregate(id: string) {
  return deleteEventAggregate(id);
}

export async function getEventRepositoryBySlug(slug: string) {
  return getEventBySlug(slug);
}

export async function getAllEventsRepository() {
  return getAllEvents();
}

export async function getPublicEventsRepository() {
  return getPublicEvents();
}

export async function getEventsRepositoryByOrganizationId(organizationId: string) {
  return getEventsByOrganizationId(organizationId);
}
