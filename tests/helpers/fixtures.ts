import { createDraftEventSeed, defaultAccessGroups } from "@/lib/event-draft";
import type { Event } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import type { ConsumerUser } from "@/types/user";

export function buildRecruiterProfile(overrides: Partial<RecruiterProfile> = {}): RecruiterProfile {
  return {
    id: "recruiter-neon-harbor",
    organizationId: "organization-recruiter-neon-harbor",
    slug: "neon-harbor",
    recruiterType: "nightclub",
    displayName: "Neon Harbor",
    ...overrides,
  };
}

export function buildConsumerUser(overrides: Partial<ConsumerUser> = {}): ConsumerUser {
  return {
    id: "consumer-luca-dea",
    username: "lucadea",
    firstName: "Luca",
    lastName: "Dea",
    email: "luca@example.com",
    city: "Northport",
    favoriteGenres: ["House"],
    notificationsEnabled: true,
    profileVisibility: "public",
    savedEventSlugs: [],
    upcomingTicketEventSlugs: [],
    pastTicketEventSlugs: [],
    ticketWalletEntries: [],
    createdAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

export function buildDraftEvent(overrides: Partial<Event> = {}): Event {
  return createDraftEventSeed({
    id: "event-space-opening-2026-08-01",
    slug: "space-opening-2026-08-01",
    organizationId: "organization-recruiter-neon-harbor",
    recruiterProfileId: "recruiter-neon-harbor",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    cover: {
      title: "Space Opening",
      description: "Opening night",
      shortDescription: "Opening",
      genreDisplayMode: "event",
      date: "2026-08-01",
      time: { start: "22:00", end: "06:00" },
      imageUrl: "/mock/event-covers/opening.jpg",
      imageAlt: "Space Opening",
      location: "Northport",
      venue: "Neon Harbor",
      capacityTarget: 2000,
      genres: ["House"],
      type: "room",
      roomSize: 2000,
      numberOfRooms: 2,
      rooms: [
        { id: "room-main", name: "Main Room", capacity: 1200, genres: ["House"] },
        { id: "room-terrace", name: "Terrace", capacity: 800, genres: ["Disco"] },
      ],
    },
    guestlist: {
      accessGroups: defaultAccessGroups,
      entries: [],
      summary: {
        ticketsSold: 0,
        manualGuests: 0,
        totalAttending: 0,
      },
    },
    tickets: {
      tiers: [],
      sections: [
        {
          id: "ticket-section-regular-entry",
          name: "Regular Entry",
          visibility: "public",
          accessGroupId: "group-regular-entry",
          allowedGroupIds: [],
          phases: [
            {
              id: "ticket-phase-general",
              name: "General Admission",
              price: 40,
              quantityAvailable: 100,
              quantitySold: 0,
              visibility: "public",
              status: "live",
              sortOrder: 0,
              releaseMode: "manual",
            },
          ],
        },
        {
          id: "ticket-section-guestlist",
          name: "Guestlist",
          visibility: "restricted",
          accessGroupId: "group-guestlist",
          allowedGroupIds: ["group-guestlist"],
          phases: [
            {
              id: "ticket-phase-guestlist",
              name: "Guestlist Access",
              price: 0,
              quantityAvailable: 50,
              quantitySold: 0,
              visibility: "public",
              status: "live",
              sortOrder: 0,
              releaseMode: "manual",
            },
          ],
        },
      ],
    },
    ...overrides,
  });
}

export function buildLivePublicEvent(overrides: Partial<Event> = {}): Event {
  return buildDraftEvent({
    status: "live",
    admissionMode: "public",
    ...overrides,
  });
}

export function buildLiveCuratedEvent(overrides: Partial<Event> = {}): Event {
  return buildDraftEvent({
    id: "event-curated-2026-08-02",
    slug: "curated-2026-08-02",
    status: "live",
    admissionMode: "curated",
    tickets: {
      tiers: [],
      sections: [
        {
          id: "ticket-section-guestlist",
          name: "Guestlist",
          visibility: "restricted",
          accessGroupId: "group-guestlist",
          allowedGroupIds: ["group-guestlist"],
          phases: [
            {
              id: "ticket-phase-guestlist",
              name: "Guestlist Access",
              price: 0,
              quantityAvailable: 50,
              quantitySold: 0,
              visibility: "public",
              status: "live",
              sortOrder: 0,
              releaseMode: "manual",
            },
          ],
        },
      ],
    },
    ...overrides,
  });
}
