"use client";

import { useSyncExternalStore } from "react";
import type { Event, EventStatus } from "@/types/event";
import { createDraftEventSeed, initialMockState } from "@/lib/mock-data";

type MockStoreState = {
  profile: typeof initialMockState.profile;
  users: typeof initialMockState.users;
  events: Event[];
};

type EventUpdate = Partial<Event> & Pick<Event, "id">;

let storeState: MockStoreState = {
  profile: initialMockState.profile,
  users: initialMockState.users,
  events: initialMockState.events,
};

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

function resetMockData() {
  updateState({
    profile: initialMockState.profile,
    users: initialMockState.users,
    events: initialMockState.events,
  });
}

export function useMockEventsStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...state,
    getEventById,
    getEventBySlug,
    getEventsByStatus,
    createDraftEvent,
    updateEvent,
    updateEventStatus,
    resetMockData,
  };
}
