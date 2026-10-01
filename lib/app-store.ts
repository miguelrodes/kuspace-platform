"use client";

import { useEffect, useSyncExternalStore } from "react";
import type {
  ArtistProfile,
  Event,
  EventStatus,
} from "@/types/event";
import type {
  TicketCheckoutIntentResult,
  TicketOrderPaymentTransitionResult,
} from "@/types/checkout";
import type { RecruiterProfile } from "@/types/profile";
import type { ConsumerUser } from "@/types/user";
import type {
  WorkspaceMembership,
  WorkspaceOrganization,
} from "@/types/workspace";
import {
  applyToCuratedEvent as applyToCuratedEventRecord,
  approveCuratedApplication as approveCuratedApplicationRecord,
  denyCuratedApplication as denyCuratedApplicationRecord,
  syncTicketPurchaseToEvent,
  syncTicketPurchaseToUser,
} from "@/lib/event-access";
import { isApiErrorPayload } from "@/lib/http/contracts";

type StoreMutationError = {
  message: string;
  code: string;
  status: number;
};

class ClientApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type AppStoreState = {
  isBootstrapped: boolean;
  profile: RecruiterProfile;
  users: ConsumerUser[];
  artists: ArtistProfile[];
  events: Event[];
  currentRole: "consumer" | "recruiter" | null;
  currentConsumerUserId: string | null;
  currentRecruiterProfileId: string | null;
  currentOrganizationId: string | null;
  currentOrganizationRole: "owner" | "member" | null;
  currentOrganization: WorkspaceOrganization | null;
  organizations?: WorkspaceMembership[];
  needsActorSelection: boolean;
  needsOrganizationSetup?: boolean;
  mutationError: StoreMutationError | null;
};

type EventUpdate = Partial<Event> & Pick<Event, "id">;
type UserUpdate = Partial<ConsumerUser> & Pick<ConsumerUser, "id">;
type EventEditorSectionUpdate = {
  id: string;
  slug: string;
  admissionMode: Event["admissionMode"];
  cover: Event["cover"];
  lineup: Event["lineup"];
  timetable: Event["timetable"];
  guestlist: Event["guestlist"];
  budget: Event["budget"];
  tickets: Event["tickets"];
};

const EMPTY_PROFILE: RecruiterProfile = {
  id: "",
  slug: "",
  recruiterType: "nightclub",
  displayName: "",
};

function getInitialStoreState(): AppStoreState {
  return {
    isBootstrapped: false,
    profile: EMPTY_PROFILE,
    users: [],
    artists: [],
    events: [],
    currentRole: null,
    currentConsumerUserId: null,
    currentRecruiterProfileId: null,
    currentOrganizationId: null,
    currentOrganizationRole: null,
    currentOrganization: null,
    organizations: [],
    needsActorSelection: false,
    needsOrganizationSetup: false,
    mutationError: null,
  };
}

function deriveArtists(events: Event[], existingArtists: ArtistProfile[] = []) {
  const fromEvents = Array.from(
    new Map(
      events
        .flatMap((event) => event.lineup.entries)
        .map((entry) => [
          entry.artistId,
          { id: entry.artistId, name: entry.name } satisfies ArtistProfile,
        ]),
    ).values(),
  );

  return Array.from(
    new Map(
      [...existingArtists, ...fromEvents].map((artist) => [artist.id, artist]),
    ).values(),
  ).sort((left, right) => left.name.localeCompare(right.name));
}

let storeState: AppStoreState = getInitialStoreState();
let bootstrapStarted = false;

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

function updateState(nextState: AppStoreState) {
  const shouldRecomputeArtists =
    nextState.events !== storeState.events ||
    nextState.artists !== storeState.artists;

  storeState = {
    ...nextState,
    artists: shouldRecomputeArtists
      ? deriveArtists(nextState.events, nextState.artists)
      : storeState.artists,
  };
  emitChange();
}

async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiErrorPayload(body)) {
      throw new ClientApiError(
        body.error.message,
        body.error.status,
        body.error.code,
        body.error.details,
      );
    }

    throw new ClientApiError(
      `Request failed: ${response.status}`,
      response.status,
      "REQUEST_FAILED",
    );
  }

  return body as T;
}

async function bootstrapFromDb() {
  const remoteState = await fetchJson<AppStoreState>("/api/store/bootstrap");
  updateState({
    ...remoteState,
    isBootstrapped: true,
    artists: remoteState.artists?.length
      ? remoteState.artists
      : deriveArtists(remoteState.events),
    mutationError: null,
  });
}

function setMutationError(error: unknown, fallbackMessage?: string) {
  const nextError = toStoreMutationError(error);

  updateState({
    ...storeState,
    isBootstrapped: true,
    mutationError: fallbackMessage
      ? {
          ...nextError,
          message: fallbackMessage,
        }
      : nextError,
  });
}

async function revalidateFromDb(previousState?: AppStoreState) {
  try {
    await bootstrapFromDb();
  } catch (error) {
    if (previousState) {
      updateState({
        ...previousState,
        mutationError: toStoreMutationError(error),
      });
      return;
    }

    setMutationError(
      error,
      "We could not refresh the latest data from the backend.",
    );
  }
}

function toStoreMutationError(error: unknown): StoreMutationError {
  if (error instanceof ClientApiError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
    };
  }

  return {
    message: "Something went wrong while saving your changes.",
    code: "REQUEST_FAILED",
    status: 500,
  };
}

async function runBackendMutation<T>({
  optimisticState,
  request,
  reconcile,
}: {
  optimisticState?: (state: AppStoreState) => AppStoreState;
  request: () => Promise<T>;
  reconcile: (state: AppStoreState, result: T) => AppStoreState;
}) {
  const previousState = storeState;

  if (optimisticState) {
    updateState(optimisticState(previousState));
  }

  try {
    const result = await request();
    updateState({
      ...reconcile(storeState, result),
      mutationError: null,
    });
    return result;
  } catch (error) {
    await revalidateFromDb(previousState);
    updateState({
      ...storeState,
      mutationError: toStoreMutationError(error),
    });
    throw error;
  }
}

function clearMutationError() {
  if (!storeState.mutationError) {
    return;
  }

  updateState({
    ...storeState,
    mutationError: null,
  });
}

function mergeEvent(existing: Event, update: EventUpdate): Event {
  return {
    ...existing,
    ...update,
    cover: update.cover
      ? { ...existing.cover, ...update.cover }
      : existing.cover,
    lineup: update.lineup
      ? { ...existing.lineup, ...update.lineup }
      : existing.lineup,
    timetable: update.timetable
      ? { ...existing.timetable, ...update.timetable }
      : existing.timetable,
    guestlist: update.guestlist
      ? { ...existing.guestlist, ...update.guestlist }
      : existing.guestlist,
    budget: update.budget
      ? { ...existing.budget, ...update.budget }
      : existing.budget,
    tickets: update.tickets
      ? { ...existing.tickets, ...update.tickets }
      : existing.tickets,
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
  if (!storeState.currentConsumerUserId) {
    return null;
  }

  return getUserById(storeState.currentConsumerUserId) ?? null;
}

async function updateProfile(update: Partial<RecruiterProfile>) {
  const nextProfile: RecruiterProfile = {
    ...storeState.profile,
    ...update,
    media: update.media
      ? { ...storeState.profile.media, ...update.media }
      : storeState.profile.media,
    location: update.location
      ? { ...storeState.profile.location, ...update.location }
      : storeState.profile.location,
    links: update.links
      ? { ...storeState.profile.links, ...update.links }
      : storeState.profile.links,
    soundProfile: update.soundProfile
      ? { ...storeState.profile.soundProfile, ...update.soundProfile }
      : storeState.profile.soundProfile,
    stats: update.stats
      ? { ...storeState.profile.stats, ...update.stats }
      : storeState.profile.stats,
  };

  return runBackendMutation({
    optimisticState: (state) => ({
      ...state,
      profile: nextProfile,
    }),
    request: () =>
      fetchJson<RecruiterProfile>("/api/store/profile", {
        method: "PUT",
        body: JSON.stringify(nextProfile),
      }),
    reconcile: (state, savedProfile) => ({
      ...state,
      profile: savedProfile,
    }),
  }).catch(() => null);
}

async function switchOrganization(organizationId: string) {
  const previousState = storeState;

  try {
    await fetchJson<{
      organization: WorkspaceOrganization;
      role: "owner" | "member";
    }>("/api/workspace/organizations/current/switch", {
      method: "POST",
      body: JSON.stringify({ organizationId }),
    });
    await bootstrapFromDb();
    return true;
  } catch (error) {
    await revalidateFromDb(previousState);
    updateState({
      ...storeState,
      mutationError: toStoreMutationError(error),
    });
    return false;
  }
}

function getArtistById(id: string) {
  return storeState.artists.find((artist) => artist.id === id);
}

function upsertArtists(nextArtists: ArtistProfile[]) {
  updateState({
    ...storeState,
    artists: deriveArtists(storeState.events, [
      ...storeState.artists,
      ...nextArtists,
    ]),
  });
}

async function createDraftEvent(overrides?: Partial<Event>) {
  const savedEvent = await fetchJson<Event>("/api/store/events", {
    method: "POST",
    body: JSON.stringify(overrides ?? {}),
  });

  updateState({
    ...storeState,
    events: [
      savedEvent,
      ...storeState.events.filter((event) => event.id !== savedEvent.id),
    ],
  });

  return savedEvent;
}

async function updateEvent(update: EventUpdate) {
  const existingEvent = getEventById(update.id);
  if (!existingEvent) {
    return null;
  }

  const nextEvent = mergeEvent(existingEvent, {
    ...update,
    updatedAt: new Date().toISOString(),
  });

  return runBackendMutation({
    optimisticState: (state) => ({
      ...state,
      events: state.events.map((event) =>
        event.id === update.id ? nextEvent : event,
      ),
    }),
    request: () =>
      fetchJson<Event>(`/api/store/events/${update.id}`, {
        method: "PUT",
        body: JSON.stringify(nextEvent),
      }),
    reconcile: (state, savedEvent) => ({
      ...state,
      events: state.events.map((event) =>
        event.id === savedEvent.id ? savedEvent : event,
      ),
    }),
  }).catch(() => null);
}

async function saveEventEditorSections(update: EventEditorSectionUpdate) {
  const existingEvent = getEventById(update.id);
  if (!existingEvent) {
    return null;
  }

  const nextEvent: Event = {
    ...existingEvent,
    slug: update.slug,
    admissionMode: update.admissionMode,
    cover: update.cover,
    lineup: update.lineup,
    timetable: update.timetable,
    guestlist: update.guestlist,
    budget: update.budget,
    tickets: update.tickets,
    updatedAt: new Date().toISOString(),
  };

  return runBackendMutation({
    optimisticState: (state) => ({
      ...state,
      events: state.events.map((event) =>
        event.id === update.id ? nextEvent : event,
      ),
    }),
    request: async () => {
      await fetchJson<Event>(`/api/store/events/${update.id}/cover`, {
        method: "PUT",
        body: JSON.stringify({
          slug: update.slug,
          admissionMode: update.admissionMode,
          cover: update.cover,
        }),
      });
      await fetchJson<Event>(`/api/store/events/${update.id}/lineup`, {
        method: "PUT",
        body: JSON.stringify({ lineup: update.lineup }),
      });
      await fetchJson<Event>(`/api/store/events/${update.id}/timetable`, {
        method: "PUT",
        body: JSON.stringify({ timetable: update.timetable }),
      });
      await fetchJson<Event>(`/api/store/events/${update.id}/guestlist`, {
        method: "PUT",
        body: JSON.stringify({ guestlist: update.guestlist }),
      });
      await fetchJson<Event>(`/api/store/events/${update.id}/budget`, {
        method: "PUT",
        body: JSON.stringify({ budget: update.budget }),
      });
      return fetchJson<Event>(`/api/store/events/${update.id}/tickets`, {
        method: "PUT",
        body: JSON.stringify({ tickets: update.tickets }),
      });
    },
    reconcile: (state, savedEvent) => ({
      ...state,
      events: state.events.map((event) =>
        event.id === savedEvent.id ? savedEvent : event,
      ),
    }),
  }).catch(() => null);
}

async function updateEventStatus(id: string, status: EventStatus) {
  const event = getEventById(id);
  if (!event) {
    return null;
  }

  const nextEvent = {
    ...event,
    status,
    updatedAt: new Date().toISOString(),
  };

  return runBackendMutation({
    optimisticState: (state) => ({
      ...state,
      events: state.events.map((candidate) =>
        candidate.id === id ? nextEvent : candidate,
      ),
    }),
    request: () =>
      fetchJson<Event>(`/api/store/events/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    reconcile: (state, savedEvent) => ({
      ...state,
      events: state.events.map((candidate) =>
        candidate.id === savedEvent.id ? savedEvent : candidate,
      ),
    }),
  }).catch(() => null);
}

async function deleteEvent(id: string) {
  return runBackendMutation({
    optimisticState: (state) => ({
      ...state,
      events: state.events.filter((event) => event.id !== id),
    }),
    request: () =>
      fetchJson<null>(`/api/store/events/${id}`, {
        method: "DELETE",
      }),
    reconcile: (state) => ({
      ...state,
      events: state.events.filter((event) => event.id !== id),
    }),
  })
    .then(() => true)
    .catch(() => false);
}

async function updateUser(update: UserUpdate) {
  const existingUser = getUserById(update.id);
  if (!existingUser) {
    return null;
  }

  const nextUser: ConsumerUser = {
    ...existingUser,
    ...update,
    username:
      typeof update.username === "string"
        ? update.username.toLowerCase()
        : existingUser.username,
  };

  return runBackendMutation({
    optimisticState: (state) => ({
      ...state,
      users: state.users.map((user) =>
        user.id === update.id ? nextUser : user,
      ),
    }),
    request: () =>
      fetchJson<ConsumerUser>(`/api/store/users/${update.id}`, {
        method: "PUT",
        body: JSON.stringify(nextUser),
      }),
    reconcile: (state, savedUser) => ({
      ...state,
      users: state.users.map((user) =>
        user.id === savedUser.id ? savedUser : user,
      ),
    }),
  }).catch(() => null);
}

async function purchaseTicketSection({
  eventId,
  userId,
  sectionId,
  phaseId,
  quantity = 1,
}: {
  eventId: string;
  userId: string;
  sectionId: string;
  phaseId: string;
  quantity?: number;
}) {
  const event = getEventById(eventId);
  const user = getUserById(userId);

  if (!event || !user) {
    return null;
  }

  const section = (event.tickets.sections ?? []).find(
    (candidate) => candidate.id === sectionId,
  );
  if (!section) {
    return null;
  }

  const phase = section.phases.find((candidate) => candidate.id === phaseId);

  if (!phase || phase.visibility !== "public" || phase.status !== "live") {
    return null;
  }

  if (phase.price > 0) {
    const result = await runBackendMutation({
      request: () =>
        fetchJson<
          TicketCheckoutIntentResult | TicketOrderPaymentTransitionResult
        >(`/api/store/events/${eventId}/purchase`, {
          method: "POST",
          body: JSON.stringify({ userId, sectionId, phaseId, quantity }),
        }),
      reconcile: (state, result) => {
        if (!result.fulfilled || !result.event || !result.user) {
          return state;
        }

        return {
          ...state,
          events: state.events.map((candidate) =>
            candidate.id === result.event!.id ? result.event! : candidate,
          ),
          users: state.users.map((candidate) =>
            candidate.id === result.user!.id ? result.user! : candidate,
          ),
        };
      },
    }).catch(() => null);

    if (
      result &&
      !result.fulfilled &&
      "checkout" in result &&
      result.checkout.stripeCheckoutUrl &&
      typeof window !== "undefined"
    ) {
      window.location.assign(result.checkout.stripeCheckoutUrl);
    }

    return result;
  }

  const purchasedAt = new Date().toISOString();
  const nextEvent = syncTicketPurchaseToEvent(event, {
    userId,
    accessGroupId: section.accessGroupId,
    ticketPhaseId: phase.id,
    purchasedAt,
    quantity,
  });
  const nextUser = syncTicketPurchaseToUser(user, {
    eventSlug: event.slug,
    quantity,
    accessGroupId: section.accessGroupId,
    ticketLabel: section.name,
    status: "active",
  });

  return runBackendMutation({
    optimisticState: (state) => ({
      ...state,
      events: state.events.map((candidate) =>
        candidate.id === eventId ? nextEvent : candidate,
      ),
      users: state.users.map((candidate) =>
        candidate.id === userId ? nextUser : candidate,
      ),
    }),
    request: () =>
      fetchJson<
        TicketCheckoutIntentResult | TicketOrderPaymentTransitionResult
      >(`/api/store/events/${eventId}/purchase`, {
        method: "POST",
        body: JSON.stringify({ userId, sectionId, phaseId, quantity }),
      }),
    reconcile: (state, result) => {
      if (!result.fulfilled || !result.event || !result.user) {
        return state;
      }

      return {
        ...state,
        events: state.events.map((candidate) =>
          candidate.id === result.event!.id ? result.event! : candidate,
        ),
        users: state.users.map((candidate) =>
          candidate.id === result.user!.id ? result.user! : candidate,
        ),
      };
    },
  }).catch(() => null);
}

async function applyToCuratedEvent({
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

  return runBackendMutation({
    optimisticState: (state) => ({
      ...state,
      events: state.events.map((candidate) =>
        candidate.id === eventId ? nextEvent : candidate,
      ),
    }),
    request: () =>
      fetchJson<Event>(`/api/store/events/${eventId}/applications/apply`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      }),
    reconcile: (state, savedEvent) => ({
      ...state,
      events: state.events.map((candidate) =>
        candidate.id === savedEvent.id ? savedEvent : candidate,
      ),
    }),
  }).catch(() => null);
}

async function approveCuratedApplication({
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

  return runBackendMutation({
    optimisticState: (state) => ({
      ...state,
      events: state.events.map((candidate) =>
        candidate.id === eventId ? nextEvent : candidate,
      ),
    }),
    request: () =>
      fetchJson<Event>(
        `/api/store/events/${eventId}/applications/${userId}/approve`,
        {
          method: "POST",
          body: JSON.stringify({ accessGroupId }),
        },
      ),
    reconcile: (state, savedEvent) => ({
      ...state,
      events: state.events.map((candidate) =>
        candidate.id === savedEvent.id ? savedEvent : candidate,
      ),
    }),
  }).catch(() => null);
}

async function denyCuratedApplication({
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

  return runBackendMutation({
    optimisticState: (state) => ({
      ...state,
      events: state.events.map((candidate) =>
        candidate.id === eventId ? nextEvent : candidate,
      ),
    }),
    request: () =>
      fetchJson<Event>(
        `/api/store/events/${eventId}/applications/${userId}/deny`,
        {
          method: "POST",
        },
      ),
    reconcile: (state, savedEvent) => ({
      ...state,
      events: state.events.map((candidate) =>
        candidate.id === savedEvent.id ? savedEvent : candidate,
      ),
    }),
  }).catch(() => null);
}

function resetAppState() {
  updateState(getInitialStoreState());
  bootstrapStarted = true;
  void bootstrapFromDb()
    .then(() => {
      bootstrapStarted = true;
    })
    .catch((error) => {
      bootstrapStarted = false;
      setMutationError(
        error,
        "We could not reload the latest data from the backend.",
      );
    });
}

export function useAppStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (bootstrapStarted) {
      return;
    }

    bootstrapStarted = true;
    void bootstrapFromDb().catch((error) => {
      bootstrapStarted = false;
      setMutationError(
        error,
        "We could not load the latest data from the backend.",
      );
    });
  }, []);

  return {
    ...state,
    getEventById,
    getEventBySlug,
    getEventsByStatus,
    getUserById,
    getCurrentConsumerUser,
    updateProfile,
    switchOrganization,
    getArtistById,
    createDraftEvent,
    updateEvent,
    saveEventEditorSections,
    updateEventStatus,
    deleteEvent,
    updateUser,
    purchaseTicketSection,
    applyToCuratedEvent,
    approveCuratedApplication,
    denyCuratedApplication,
    upsertArtists,
    resetAppState,
    clearMutationError,
  };
}
