"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ArtistProfile, Event, EventAccessAssignment, EventStatus } from "@/types/event";
import { createDraftEventSeed, initialMockState } from "@/lib/mock-data";
import {
  applyToCuratedEvent as applyToCuratedEventRecord,
  approveCuratedApplication as approveCuratedApplicationRecord,
  denyCuratedApplication as denyCuratedApplicationRecord,
  syncTicketPurchaseToEvent,
  syncTicketPurchaseToUser,
  syncUserWalletPurchasesIntoEvents,
} from "@/lib/event-access";

type MockStoreState = {
  profile: typeof initialMockState.profile;
  users: typeof initialMockState.users;
  artists: ArtistProfile[];
  events: Event[];
};

type EventUpdate = Partial<Event> & Pick<Event, "id">;
type UserUpdate = Partial<MockStoreState["users"][number]> & Pick<MockStoreState["users"][number], "id">;

const MOCK_STORE_STORAGE_KEY = "office-mvp-mock-store";

function getInitialStoreState(): MockStoreState {
  return {
    profile: initialMockState.profile,
    users: initialMockState.users,
    artists: initialMockState.artists,
    events: initialMockState.events,
  };
}

function readPersistedState(): MockStoreState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(MOCK_STORE_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<MockStoreState> | null;
    if (
      !parsed ||
      !parsed.profile ||
      !Array.isArray(parsed.users) ||
      !Array.isArray(parsed.artists) ||
      !Array.isArray(parsed.events)
    ) {
      return null;
    }

    return {
      profile: parsed.profile,
      users: parsed.users,
      artists: parsed.artists,
      events: parsed.events,
    };
  } catch {
    return null;
  }
}

function normalizePersistedState(nextState: MockStoreState): MockStoreState {
  const defaultUser = initialMockState.users[0];
  const normalizedEvents = syncUserWalletPurchasesIntoEvents(
    nextState.events.map((event) => {
      const seededEvent = initialMockState.events.find((candidate) => candidate.id === event.id);
      const eventSource = event;
      const fallbackGuestlist = event.guestlist ?? seededEvent?.guestlist ?? {
        accessGroups: [],
        entries: [],
        summary: {
          ticketsSold: 0,
          manualGuests: 0,
          totalAttending: 0,
        },
      };
      const fallbackAccessGroups = fallbackGuestlist.accessGroups ?? [];

      return {
        ...(seededEvent ?? {}),
        ...eventSource,
        guestlist: {
          ...fallbackGuestlist,
          accessGroups: fallbackAccessGroups,
          entries: fallbackGuestlist.entries ?? [],
        },
        admissionMode: eventSource.admissionMode ?? seededEvent?.admissionMode ?? "public",
        applications: event.applications ?? eventSource.applications ?? [],
        accessAssignments: ((eventSource.accessAssignments?.length
          ? eventSource.accessAssignments
          : fallbackGuestlist.entries.flatMap((entry) => {
              if (entry.source !== "user") {
                return [];
              }

              const source: EventAccessAssignment["source"] =
                entry.accessGroupId === "group-guestlist" ? "manual" : "purchase";
              const paymentState: EventAccessAssignment["paymentState"] =
                entry.accessGroupId === "group-guestlist" ? "not_required" : "paid";

              return [
                {
                  eventId: event.id,
                  userId: entry.userId,
                  accessGroupId: entry.accessGroupId,
                  source,
                  paymentState,
                  checkedIn: entry.checkedIn,
                  assignedAt: entry.createdAt,
                },
              ];
            })) ?? []
        ).filter(
          (assignment, index, assignments) =>
            assignments.findIndex(
              (candidate) =>
                candidate.eventId === assignment.eventId &&
                candidate.userId === assignment.userId,
            ) === index,
        ),
        tickets: {
          ...(seededEvent?.tickets ?? {}),
          ...eventSource.tickets,
          sections: (eventSource.tickets.sections ?? seededEvent?.tickets.sections ?? []).map((section) => ({
            ...section,
            visibility:
              (section.visibility as string) === "guestlist" ? "restricted" : section.visibility,
            accessGroupId:
              section.accessGroupId ||
              fallbackAccessGroups.find(
                (group) => group.name.trim().toLowerCase() === section.name.trim().toLowerCase(),
              )?.id ||
              fallbackAccessGroups[0]?.id ||
              "",
            allowedGroupIds:
              ((section.visibility as string) === "restricted" ||
                (section.visibility as string) === "guestlist")
                ? (section.allowedGroupIds?.filter(Boolean).length
                    ? section.allowedGroupIds.filter(Boolean)
                    : [
                        section.accessGroupId ||
                          fallbackAccessGroups.find(
                            (group) =>
                              group.name.trim().toLowerCase() === section.name.trim().toLowerCase(),
                          )?.id ||
                          fallbackAccessGroups[0]?.id ||
                          "",
                      ].filter(Boolean))
                : [],
          })),
        },
      };
    }),
    nextState.users,
  );

  return {
    ...nextState,
    events: normalizedEvents,
    users: nextState.users.map((user) => {
      if (!defaultUser || user.id !== defaultUser.id) {
        return user;
      }

      const normalizedUsername = (user.username || defaultUser.username).toLowerCase();
      const shouldNormalizeDefaultUser =
        normalizedUsername !== defaultUser.username ||
        JSON.stringify(user.savedEventSlugs ?? []) !== JSON.stringify(defaultUser.savedEventSlugs ?? []) ||
        JSON.stringify(user.upcomingTicketEventSlugs ?? []) !==
          JSON.stringify(defaultUser.upcomingTicketEventSlugs ?? []) ||
        JSON.stringify(user.pastTicketEventSlugs ?? []) !==
          JSON.stringify(defaultUser.pastTicketEventSlugs ?? []) ||
        JSON.stringify(user.ticketWalletEntries ?? []) !==
          JSON.stringify(defaultUser.ticketWalletEntries ?? []);

      if (shouldNormalizeDefaultUser) {
        return {
          ...user,
          username: defaultUser.username,
          email:
            user.email === `${user.username}@mockspaceibiza.com` || !user.email
              ? defaultUser.email
              : user.email,
          savedEventSlugs: defaultUser.savedEventSlugs,
          upcomingTicketEventSlugs: defaultUser.upcomingTicketEventSlugs,
          pastTicketEventSlugs: defaultUser.pastTicketEventSlugs,
          ticketWalletEntries: defaultUser.ticketWalletEntries,
        };
      }

      return user;
    }),
  };
}

function persistState(nextState: MockStoreState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(MOCK_STORE_STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    // Ignore persistence failures so demos still work without breaking the app.
  }
}

let storeState: MockStoreState = getInitialStoreState();

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return storeState;
}

function updateState(nextState: MockStoreState) {
  storeState = nextState;
  persistState(nextState);
  emitChange();
}

function mergeEvent(existing: Event, update: EventUpdate): Event {
  return {
    ...existing,
    ...update,
    cover: update.cover ? { ...existing.cover, ...update.cover } : existing.cover,
    lineup: update.lineup
      ? {
          ...existing.lineup,
          ...update.lineup,
        }
      : existing.lineup,
    timetable: update.timetable
      ? {
          ...existing.timetable,
          ...update.timetable,
        }
      : existing.timetable,
    guestlist: update.guestlist
      ? {
          ...existing.guestlist,
          ...update.guestlist,
        }
      : existing.guestlist,
    budget: update.budget
      ? {
          ...existing.budget,
          ...update.budget,
        }
      : existing.budget,
    tickets: update.tickets
      ? {
          ...existing.tickets,
          ...update.tickets,
        }
      : existing.tickets,
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

function getArtistById(id: string) {
  return storeState.artists.find((artist) => artist.id === id);
}

function upsertArtists(nextArtists: ArtistProfile[]) {
  const artistMap = new Map(storeState.artists.map((artist) => [artist.id, artist]));

  nextArtists.forEach((artist) => {
    const existing = artistMap.get(artist.id);
    artistMap.set(artist.id, {
      ...existing,
      ...artist,
    });
  });

  updateState({
    ...storeState,
    artists: Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
  });
}

function createDraftEvent(overrides?: Partial<Event>) {
  const draft = createDraftEventSeed(overrides);

  updateState({
    ...storeState,
    events: [draft, ...storeState.events],
  });

  return draft;
}

function updateEvent(update: EventUpdate) {
  const nextEvents = storeState.events.map((event) =>
    event.id === update.id
      ? mergeEvent(event, {
          ...update,
          updatedAt: new Date().toISOString(),
        })
      : event
  );

  updateState({
    ...storeState,
    events: nextEvents,
  });

  return nextEvents.find((event) => event.id === update.id);
}

function updateEventStatus(id: string, status: EventStatus) {
  return updateEvent({
    id,
    status,
  });
}

function deleteEvent(id: string) {
  const nextEvents = storeState.events.filter((event) => event.id !== id);

  updateState({
    ...storeState,
    events: nextEvents,
  });
}

function updateUser(update: UserUpdate) {
  const nextUsers = storeState.users.map((user) =>
    user.id === update.id
      ? {
          ...user,
          ...update,
          username:
            typeof update.username === "string" ? update.username.toLowerCase() : user.username,
        }
      : user,
  );

  updateState({
    ...storeState,
    users: nextUsers,
  });

  return nextUsers.find((user) => user.id === update.id);
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
  const nextUsers = storeState.users.map((candidate) =>
    candidate.id === userId
      ? syncTicketPurchaseToUser(candidate, {
          eventSlug: event.slug,
          quantity,
          accessGroupId: section.accessGroupId,
          ticketLabel: section.name,
          status: "active",
        })
      : candidate,
  );
  const nextEvents = storeState.events.map((candidate) =>
    candidate.id === eventId
      ? syncTicketPurchaseToEvent(candidate, {
          userId,
          accessGroupId: section.accessGroupId,
          purchasedAt,
        })
      : candidate,
  );

  updateState({
    ...storeState,
    users: nextUsers,
    events: nextEvents,
  });

  return nextEvents.find((candidate) => candidate.id === eventId) ?? null;
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

  const nextEvents = storeState.events.map((candidate) =>
    candidate.id === eventId
      ? applyToCuratedEventRecord(candidate, userId)
      : candidate,
  );

  updateState({
    ...storeState,
    events: nextEvents,
  });

  return nextEvents.find((candidate) => candidate.id === eventId) ?? null;
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

  const nextEvents = storeState.events.map((candidate) =>
    candidate.id === eventId
      ? approveCuratedApplicationRecord(candidate, {
          userId,
          accessGroupId,
        })
      : candidate,
  );

  updateState({
    ...storeState,
    events: nextEvents,
  });

  return nextEvents.find((candidate) => candidate.id === eventId) ?? null;
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

  const nextEvents = storeState.events.map((candidate) =>
    candidate.id === eventId
      ? denyCuratedApplicationRecord(candidate, {
          userId,
        })
      : candidate,
  );

  updateState({
    ...storeState,
    events: nextEvents,
  });

  return nextEvents.find((candidate) => candidate.id === eventId) ?? null;
}

function resetMockData() {
  updateState(getInitialStoreState());
}

export function useMockEventsStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    const persistedState = readPersistedState();

    if (!persistedState) {
      return;
    }

    const normalizedState = normalizePersistedState(persistedState);
    const nextSerialized = JSON.stringify(normalizedState);
    const currentSerialized = JSON.stringify(storeState);

    if (nextSerialized !== currentSerialized) {
      updateState(normalizedState);
    }
  }, []);

  return {
    ...state,
    getEventById,
    getEventBySlug,
    getEventsByStatus,
    getUserById,
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
