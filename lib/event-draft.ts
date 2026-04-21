import type { AccessGroup, Event } from "@/types/event";

export const defaultRecruiterProfileId = "recruiter-neon-harbor";

export const defaultAccessGroups: AccessGroup[] = [
  { id: "group-regular-entry", name: "Regular Entry" },
  { id: "group-vip", name: "VIP" },
  { id: "group-guestlist", name: "Guestlist" },
];

export function buildDefaultTicketSections(): Event["tickets"]["sections"] {
  return [
    {
      id: "ticket-section-regular-entry",
      name: "Regular Entry",
      visibility: "public",
      accessGroupId: "group-regular-entry",
      allowedGroupIds: [],
      phases: [],
    },
    {
      id: "ticket-section-vip",
      name: "VIP",
      visibility: "public",
      accessGroupId: "group-vip",
      allowedGroupIds: [],
      phases: [],
    },
    {
      id: "ticket-section-guestlist",
      name: "Guestlist",
      visibility: "restricted",
      accessGroupId: "group-guestlist",
      allowedGroupIds: ["group-guestlist"],
      phases: [],
    },
  ];
}

export function createDraftEventSeed(overrides?: Partial<Event>): Event {
  const timestamp = Date.now();
  const id = `event-draft-${timestamp}`;
  const slug = `draft-${timestamp}`;

  return {
    id,
    slug,
    status: "draft",
    admissionMode: "public",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    recruiterProfileId: defaultRecruiterProfileId,
    cover: {
      title: "",
      description: "",
      shortDescription: "",
      genreDisplayMode: "event",
      date: "",
      time: {
        start: "",
        end: "",
      },
      imageUrl: "/mock/event-covers/draft-placeholder.jpg",
      imageAlt: "Draft event placeholder artwork",
      location: "",
      venue: "",
      capacityTarget: 0,
      genres: [],
      type: "room",
      roomSize: 0,
      numberOfRooms: 0,
      rooms: [],
    },
    lineup: {
      displayMode: "event",
      entries: [],
    },
    timetable: {
      startTime: "",
      endTime: "",
      rows: [],
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
    accessAssignments: [],
    applications: [],
    budget: {
      totalBudget: 0,
      items: [],
    },
    tickets: {
      tiers: [],
      sections: buildDefaultTicketSections(),
    },
    ...overrides,
  };
}
