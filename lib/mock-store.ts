"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ArtistProfile, Event, EventAccessAssignment, EventStatus } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import type { ConsumerUser } from "@/types/user";
import { createDraftEventSeed } from "@/lib/event-draft";
import {
  applyToCuratedEvent as applyToCuratedEventRecord,
  approveCuratedApplication as approveCuratedApplicationRecord,
  denyCuratedApplication as denyCuratedApplicationRecord,
  syncTicketPurchaseToEvent,
  syncTicketPurchaseToUser,
} from "@/lib/event-access";

type MockStoreState = {
  profile: RecruiterProfile;
  users: ConsumerUser[];
  artists: ArtistProfile[];
  events: Event[];
};

type EventUpdate = Partial<Event> & Pick<Event, "id">;
type UserUpdate = Partial<ConsumerUser> & Pick<ConsumerUser, "id">;

const EMPTY_PROFILE: RecruiterProfile = {
  id: "",
  slug: "",
  recruiterType: "nightclub",
  displayName: "",
};

function getInitialStoreState(): MockStoreState {
  return {
    profile: EMPTY_PROFILE,
    users: [],
    artists: [],
    events: [],
  };
}

function deriveArtists(events: Event[], existingArtists: ArtistProfile[] = []) {
  const fromEvents = Array.from(
    new Map(
      events
        .flatMap((event) => event.lineup.entries)
        .map((entry) => [entry.artistId, { id: entry.artistId, name: entry.name } satisfies ArtistProfile]),
    ).values(),
  );

  return Array.from(
    new Map([...existingArtists, ...fromEvents].map((artist) => [artist.id, artist])).values(),
  ).sort((left, right) => left.name.localeCompare(right.name));
}

let storeState: MockStoreState = getInitialStoreState();
let hasBootstrapped = false;

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return storeState;
}

function updateState(nextState: MockStoreState) {
  storeState = {
    ...nextState,
    artists: deriveArtists(nextState.events, nextState.artists),
  };
  emitChange();
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function bootstrapFromDb() {
  const remoteState = await fetchJson<MockStoreState>("/api/store/bootstrap");
  updateState({
    ...remoteState,
    artists: remoteState.artists?.length
      ? remoteState.artists
      : deriveArtists(remoteState.events),
  });
}

function mergeEvent(existing: Event, update: EventUpdate): Event {
  return {
    ...existing,
    ...update,
    cover: update.cover ? { ...existing.cover, ...update.cover } : existing.cover,
    lineup: update.lineup ? { ...existing.lineup, ...update.lineup } : existing.lineup,
    timetable: update.timetable ? { ...existing.timetable, ...update.timetable } : existing.timetable,
    guestlist: update.guestlist ? { ...existing.guestlist, ...update.guestlist } : existing.guestlist,
    budget: update.budget ? { ...existing.budget, ...update.budget } : existing.budget,
    tickets: update.tickets ? { ...existing.tickets, ...update.tickets } : existing.tickets,
    labels: update.labels ?? existing.labels,
    applications: update.applications ?? existing.applications,
    accessAssignments: update.accessAssignments ?? existing.accessAssignments,
  };
}

function getEventById(id: string) {
  return storeState.events.find((event) => event.id === id);
}

function getEventBySlug(slug: string) {
  return storeState.events.find((event) => event.slug === slug);
}

function getEventsByStatus(status: EventStatus) {
  return storeState.events.filter((event) => event.status === status);
}

function getUserById(id: string) {
  return storeState.users.find((user) => user.id === id);
}

function getCurrentConsumerUser() {
  return storeState.users[0] ?? null;
}

function getArtistById(id: string) {
  return storeState.artists.find((artist) => artist.id === id);
}

function upsertArtists(nextArtists: ArtistProfile[]) {
  updateState({
    ...storeState,
    artists: deriveArtists(storeState.events, [...storeState.artists, ...nextArtists]),
  });
}

function createDraftEvent(overrides?: Partial<Event>) {
  const draft = createDraftEventSeed(overrides);

  updateState({
    ...storeState,
    events: [draft, ...storeState.events],
  });

  void fetchJson<Event>("/api/store/events", {
    method: "POST",
    body: JSON.stringify(draft),
  }).then((savedEvent) => {
    updateState({
      ...storeState,
      events: storeState.events.map((event) => (event.id === savedEvent.id ? savedEvent : event)),
    });
  }).catch(() => {});

  return draft;
}

function updateEvent(update: EventUpdate) {
  const existingEvent = getEventById(update.id);
  if (!existingEvent) {
    return null;
  }

  const nextEvent = mergeEvent(existingEvent, {
    ...update,
    updatedAt: new Date().toISOString(),
  });

  updateState({
    ...storeState,
    events: storeState.events.map((event) => (event.id === update.id ? nextEvent : event)),
  });

  void fetchJson<Event>(`/api/store/events/${update.id}`, {
    method: "PUT",
    body: JSON.stringify(nextEvent),
  }).then((savedEvent) => {
    updateState({
      ...storeState,
      events: storeState.events.map((event) => (event.id === savedEvent.id ? savedEvent : event)),
    });
  }).catch(() => {});

  return nextEvent;
}

function updateEventStatus(id: string, status: EventStatus) {
  return updateEvent({ id, status });
}

function deleteEvent(id: string) {
  updateState({
    ...storeState,
    events: storeState.events.filter((event) => event.id !== id),
  });

  void fetch(`/api/store/events/${id}`, {
    method: "DELETE",
    cache: "no-store",
  }).catch(() => {});
}

function updateUser(update: UserUpdate) {
  const existingUser = getUserById(update.id);
  if (!existingUser) {
    return null;
  }

  const nextUser: ConsumerUser = {
    ...existingUser,
    ...update,
    username:
      typeof update.username === "string" ? update.username.toLowerCase() : existingUser.username,
  };

  updateState({
    ...storeState,
    users: storeState.users.map((user) => (user.id === update.id ? nextUser : user)),
  });

  void fetchJson<ConsumerUser>(`/api/store/users/${update.id}`, {
    method: "PUT",
    body: JSON.stringify(nextUser),
  }).then((savedUser) => {
    updateState({
      ...storeState,
      users: storeState.users.map((user) => (user.id === savedUser.id ? savedUser : user)),
    });
  }).catch(() => {});

  return nextUser;
}

function purchaseTicketSection({
  eventId,
  userId,
  sectionId,
  quantity = 1,
}: {
  eventId: string;
  userId: string;
  sectionId: string;
  quantity?: number;
}) {
  const event = getEventById(eventId);
  const user = getUserById(userId);

  if (!event || !user) {
    return null;
  }

  const section = (event.tickets.sections ?? []).find((candidate) => candidate.id === sectionId);
  if (!section) {
    return null;
  }

  const purchasedAt = new Date().toISOString();
  const nextEvent = syncTicketPurchaseToEvent(event, {
    userId,
    accessGroupId: section.accessGroupId,
    purchasedAt,
  });
  const nextUser = syncTicketPurchaseToUser(user, {
    eventSlug: event.slug,
    quantity,
    accessGroupId: section.accessGroupId,
    ticketLabel: section.name,
    status: "active",
  });

  updateState({
    ...storeState,
    events: storeState.events.map((candidate) => (candidate.id === eventId ? nextEvent : candidate)),
    users: storeState.users.map((candidate) => (candidate.id === userId ? nextUser : candidate)),
  });

  void fetchJson<{ event: Event; user: ConsumerUser }>(`/api/store/events/${eventId}/purchase`, {
    method: "POST",
    body: JSON.stringify({ userId, sectionId, quantity }),
  }).then(({ event: savedEvent, user: savedUser }) => {
    updateState({
      ...storeState,
      events: storeState.events.map((candidate) => (candidate.id === savedEvent.id ? savedEvent : candidate)),
      users: storeState.users.map((candidate) => (candidate.id === savedUser.id ? savedUser : candidate)),
    });
  }).catch(() => {});

  return nextEvent;
}

function applyToCuratedEvent({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const event = getEventById(eventId);
  if (!event || event.admissionMode !== "curated") {
    return null;
  }

  const nextEvent = applyToCuratedEventRecord(event, userId);
  updateState({
    ...storeState,
    events: storeState.events.map((candidate) => (candidate.id === eventId ? nextEvent : candidate)),
  });

  void fetchJson<Event>(`/api/store/events/${eventId}/applications/apply`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  }).then((savedEvent) => {
    updateState({
      ...storeState,
      events: storeState.events.map((candidate) => (candidate.id === savedEvent.id ? savedEvent : candidate)),
    });
  }).catch(() => {});

  return nextEvent;
}

function approveCuratedApplication({
  eventId,
  userId,
  accessGroupId,
}: {
  eventId: string;
  userId: string;
  accessGroupId: string;
}) {
  const event = getEventById(eventId);
  if (!event || event.admissionMode !== "curated") {
    return null;
  }

  const nextEvent = approveCuratedApplicationRecord(event, {
    userId,
    accessGroupId,
  });

  updateState({
    ...storeState,
    events: storeState.events.map((candidate) => (candidate.id === eventId ? nextEvent : candidate)),
  });

  void fetchJson<Event>(`/api/store/events/${eventId}/applications/${userId}/approve`, {
    method: "POST",
    body: JSON.stringify({ accessGroupId }),
  }).then((savedEvent) => {
    updateState({
      ...storeState,
      events: storeState.events.map((candidate) => (candidate.id === savedEvent.id ? savedEvent : candidate)),
    });
  }).catch(() => {});

  return nextEvent;
}

function denyCuratedApplication({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const event = getEventById(eventId);
  if (!event || event.admissionMode !== "curated") {
    return null;
  }

  const nextEvent = denyCuratedApplicationRecord(event, {
    userId,
  });

  updateState({
    ...storeState,
    events: storeState.events.map((candidate) => (candidate.id === eventId ? nextEvent : candidate)),
  });

  void fetchJson<Event>(`/api/store/events/${eventId}/applications/${userId}/deny`, {
    method: "POST",
  }).then((savedEvent) => {
    updateState({
      ...storeState,
      events: storeState.events.map((candidate) => (candidate.id === savedEvent.id ? savedEvent : candidate)),
    });
  }).catch(() => {});

  return nextEvent;
}

function resetMockData() {
  updateState(getInitialStoreState());
  hasBootstrapped = false;
  void bootstrapFromDb().then(() => {
    hasBootstrapped = true;
  }).catch(() => {
    hasBootstrapped = false;
  });
}

export function useMockEventsStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (hasBootstrapped) {
      return;
    }

    hasBootstrapped = true;
    void bootstrapFromDb().catch(() => {
      hasBootstrapped = false;
    });
  }, []);

  return {
    ...state,
    getEventById,
    getEventBySlug,
    getEventsByStatus,
    getUserById,
    getCurrentConsumerUser,
    getArtistById,
    createDraftEvent,
    updateEvent,
    updateEventStatus,
    deleteEvent,
    updateUser,
    purchaseTicketSection,
    applyToCuratedEvent,
    approveCuratedApplication,
    denyCuratedApplication,
    upsertArtists,
    resetMockData,
  };
}
