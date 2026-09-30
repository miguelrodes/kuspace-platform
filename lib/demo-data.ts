import type {
  AccessGroup,
  ArtistProfile,
  BudgetItem,
  Event,
  EventAccessAssignment,
  EventLabel,
  EventStatus,
  EventType,
  GuestlistEntry,
  LineupEntry,
  TicketReleaseMode,
  TicketSection,
  TicketTier,
  TicketTierStatus,
  TimetableRow,
} from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import type { ConsumerUser } from "@/types/user";
import { syncTicketPurchaseToEvent } from "@/lib/event-access";
import {
  defaultAccessGroups,
  defaultOrganizationId,
  defaultRecruiterProfileId,
} from "@/lib/event-draft";
import { buildOwnerEventLabel } from "@/lib/event-labels";

type TicketPlan = {
  name: string;
  price: number;
  quantityAvailable: number;
  quantitySold: number;
  status: TicketTierStatus;
};

type DemoEventSeed = {
  id: string;
  title: string;
  date: string;
  status: EventStatus;
  admissionMode?: Event["admissionMode"];
  description: string;
  shortDescription: string;
  artists: string[];
  genres: string[];
  startTime: string;
  endTime: string;
  capacityTarget: number;
  type: EventType;
  roomNames: string[];
  imageUrl: string;
  budgetItems: BudgetItem[];
  ticketPlan: TicketPlan[];
  guestCount: number;
  partialDraft?: boolean;
};

export type DemoTicketOrderSeed = {
  eventId: string;
  consumerUserId: string;
  ticketSectionId: string;
  ticketPhaseId: string;
  quantity: number;
  unitPrice: number;
};

const venueName = "Neon Harbor";
const locationText = "Northport Waterfront";
const demoNowIso = "2030-05-15T23:30:00.000Z";
const accessGroups: AccessGroup[] = defaultAccessGroups;

const demoPeople = [
  ["Avery", "Vale"],
  ["Mina", "Quill"],
  ["Rowan", "Morrow"],
  ["Iris", "Keene"],
  ["Theo", "Lark"],
  ["Nora", "Venn"],
  ["Jules", "Arden"],
  ["Cleo", "North"],
  ["Milo", "Reed"],
  ["Tess", "Hale"],
  ["Orin", "Wells"],
  ["Lina", "Drift"],
  ["Sage", "Aster"],
  ["Remy", "Frost"],
  ["Nia", "Sol"],
  ["Ezra", "Pike"],
  ["Mara", "Dune"],
  ["Ivo", "Slate"],
  ["Aya", "Kestrel"],
  ["Noel", "Cinder"],
  ["Vera", "Moss"],
  ["Leon", "Quartz"],
  ["Zara", "Bloom"],
  ["Emil", "Coast"],
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function artistIdForName(name: string) {
  return `artist-${slugify(name)}`;
}

function buildLineup(names: string[], roomNames: string[]) {
  return names.map<LineupEntry>((name, index) => {
    const primaryRoom = roomNames[index % roomNames.length];
    const secondaryRoom =
      index === 0 && roomNames.length > 1 ? roomNames[1] : undefined;

    return {
      id: `${artistIdForName(name)}-${index + 1}`,
      artistId: artistIdForName(name),
      name,
      kind:
        index === names.length - 1
          ? "main"
          : index === 0
            ? "opener"
            : "resident",
      roomId: primaryRoom,
      roomIds: secondaryRoom ? [primaryRoom, secondaryRoom] : [primaryRoom],
    };
  });
}

function buildTicketTiers(
  eventSlug: string,
  plans: TicketPlan[],
): TicketTier[] {
  return plans.map((plan, index) => ({
    id: `${eventSlug}-ticket-${slugify(plan.name)}`,
    name: plan.name,
    price: plan.price,
    quantityAvailable: plan.quantityAvailable,
    quantitySold: plan.quantitySold,
    visibility: "public",
    status: plan.status,
    sortOrder: index,
    releaseAfterTierId:
      index > 0
        ? `${eventSlug}-ticket-${slugify(plans[index - 1].name)}`
        : undefined,
  }));
}

function buildTicketSections(
  eventSlug: string,
  eventDate: string,
  status: EventStatus,
  plans: TicketPlan[],
  guestCount: number,
): TicketSection[] {
  const saleWindowStart = "2030-04-01T10:00:00.000Z";
  const eventStart = `${eventDate}T22:00:00.000Z`;

  const withReleaseRules = (plan: TicketPlan, index: number) => ({
    id: `${eventSlug}-ticket-${slugify(plan.name)}`,
    name: plan.name,
    price: plan.price,
    quantityAvailable: plan.quantityAvailable,
    quantitySold: plan.quantitySold,
    visibility: "public" as const,
    status: plan.status,
    sortOrder: index,
    salesStart: status === "draft" ? undefined : saleWindowStart,
    salesEnd:
      status === "past"
        ? eventStart
        : status === "live"
          ? demoNowIso
          : undefined,
    releaseMode: (index === 0
      ? "manual"
      : "after_previous_sold_out") as TicketReleaseMode,
    releaseAfterTierId:
      index > 0
        ? `${eventSlug}-ticket-${slugify(plans[index - 1].name)}`
        : undefined,
  });

  const generalPlans = plans.filter((plan) => !plan.name.startsWith("VIP"));
  const vipPlans = plans.filter((plan) => plan.name.startsWith("VIP"));
  const sections: TicketSection[] = [];

  if (generalPlans.length > 0) {
    sections.push({
      id: `${eventSlug}-section-regular-entry`,
      name: "Regular Entry",
      visibility: "public",
      accessGroupId: "group-regular-entry",
      allowedGroupIds: [],
      phases: generalPlans.map(withReleaseRules),
    });
  }

  if (vipPlans.length > 0) {
    sections.push({
      id: `${eventSlug}-section-vip`,
      name: "VIP",
      visibility: "public",
      accessGroupId: "group-vip",
      allowedGroupIds: [],
      phases: vipPlans.map((plan, index) =>
        withReleaseRules(plan, generalPlans.length + index),
      ),
    });
  }

  sections.push({
    id: `${eventSlug}-section-guestlist`,
    name: "Guestlist",
    visibility: "restricted",
    accessGroupId: "group-guestlist",
    allowedGroupIds: ["group-guestlist"],
    phases: [
      {
        id: `${eventSlug}-ticket-guestlist`,
        name: "Guestlist Entry",
        price: 0,
        quantityAvailable: Math.max(guestCount + 20, 40),
        quantitySold: status === "past" || status === "live" ? guestCount : 0,
        visibility: "public",
        status:
          status === "past"
            ? "sold_out"
            : status === "live"
              ? "live"
              : "upcoming",
        sortOrder: 0,
        salesStart: status === "draft" ? undefined : saleWindowStart,
        salesEnd: status === "past" ? eventStart : undefined,
        releaseMode: "manual",
      },
    ],
  });

  return sections;
}

function buildTimetableRows(
  eventSlug: string,
  lineup: LineupEntry[],
  startTime: string,
  endTime: string,
  roomNames: string[],
  partialDraft = false,
): TimetableRow[] {
  const rows: TimetableRow[] = [
    {
      id: `${eventSlug}-doors`,
      title: "Doors",
      room: roomNames[0],
      startTime,
      endTime: "23:00",
      sortOrder: 0,
    },
  ];

  const visibleLineup = partialDraft ? lineup.slice(0, 2) : lineup;
  visibleLineup.forEach((entry, index) => {
    const startHour = (23 + index) % 24;
    const endHour = (startHour + 1) % 24;
    rows.push({
      id: `${eventSlug}-${entry.id}-slot`,
      title: entry.name,
      lineupEntryId: entry.id,
      room: roomNames[index % roomNames.length],
      notes: index === 0 ? "Opening set" : undefined,
      startTime: `${String(startHour).padStart(2, "0")}:00`,
      endTime: `${String(endHour).padStart(2, "0")}:00`,
      sortOrder: rows.length,
    });
  });

  rows.push({
    id: `${eventSlug}-close`,
    title: "Close",
    room: roomNames[0],
    startTime: endTime,
    endTime,
    sortOrder: rows.length,
  });

  return rows;
}

const demoUsers: ConsumerUser[] = demoPeople.map(
  ([firstName, lastName], index) => {
    const username = `${slugify(firstName)}-${slugify(lastName)}-${index + 1}`;

    return {
      id: `consumer-${index + 1}`,
      username,
      firstName,
      lastName,
      email: `${username}@example.test`,
      city: index % 2 === 0 ? "Northport" : "Lumen Bay",
      profileVisibility: index % 4 === 0 ? "private" : "public",
      notificationsEnabled: index % 5 !== 0,
      favoriteGenres:
        index % 3 === 0
          ? ["House", "Electro", "Disco"]
          : index % 3 === 1
            ? ["Techno", "Ambient", "Breaks"]
            : ["Garage", "Bass", "Leftfield"],
      savedEventSlugs: [],
      upcomingTicketEventSlugs: [],
      pastTicketEventSlugs: [],
      ticketWalletEntries: [],
      createdAt: `2030-03-${String((index % 24) + 1).padStart(2, "0")}T12:00:00.000Z`,
    };
  },
);

function buildGuestlistData(
  seed: DemoEventSeed,
  eventSlug: string,
  offset: number,
) {
  const userEntryCount = Math.min(
    seed.guestCount,
    seed.status === "draft" ? 2 : 8,
  );
  const manualEntryCount = Math.min(
    Math.max(seed.guestCount - userEntryCount, 0),
    4,
  );
  const checkedInRatio =
    seed.status === "past" ? 0.8 : seed.status === "live" ? 0.4 : 0;
  const entries: GuestlistEntry[] = [];

  for (let index = 0; index < userEntryCount; index += 1) {
    const user = demoUsers[(offset + index) % demoUsers.length];
    entries.push({
      id: `${eventSlug}-guest-user-${index + 1}`,
      source: "user",
      userId: user.id,
      accessGroupId: index % 5 === 0 ? "group-vip" : "group-regular-entry",
      checkedIn: index < Math.floor(userEntryCount * checkedInRatio),
      createdAt: `2030-04-${String((index % 20) + 1).padStart(2, "0")}T16:00:00.000Z`,
    });
  }

  for (let index = 0; index < manualEntryCount; index += 1) {
    const [firstName, lastName] =
      demoPeople[(offset + userEntryCount + index) % demoPeople.length];
    entries.push({
      id: `${eventSlug}-guest-manual-${index + 1}`,
      source: "manual",
      firstName,
      lastName,
      accessGroupId: "group-guestlist",
      checkedIn: index < Math.floor(manualEntryCount * checkedInRatio),
      createdAt: `2030-04-${String((index % 20) + 1).padStart(2, "0")}T17:00:00.000Z`,
      notes: "Fictional demo guest",
    });
  }

  return {
    entries,
    summary: {
      ticketsSold: seed.ticketPlan.reduce(
        (total, plan) => total + plan.quantitySold,
        0,
      ),
      manualGuests: manualEntryCount,
      totalAttending: entries.length,
    },
  };
}

function buildAccessAssignments(
  eventId: string,
  entries: GuestlistEntry[],
): EventAccessAssignment[] {
  return entries
    .filter(
      (entry): entry is Extract<GuestlistEntry, { source: "user" }> =>
        entry.source === "user",
    )
    .map((entry) => ({
      eventId,
      userId: entry.userId,
      accessGroupId: entry.accessGroupId,
      source: "purchase",
      paymentState: "paid",
      checkedIn: entry.checkedIn,
      assignedAt: entry.createdAt,
    }));
}

function buildLabels(): EventLabel[] {
  return [
    buildOwnerEventLabel({
      id: defaultRecruiterProfileId,
      slug: "neon-harbor",
      recruiterType: "nightclub",
      displayName: venueName,
      media: {
        avatarImageUrl: "/demo/profiles/neon-harbor-avatar.svg",
      },
    }),
  ];
}

function buildEvent(seed: DemoEventSeed, index: number): Event {
  const slug = `${slugify(seed.title)}-${seed.date}`;
  const lineup = buildLineup(seed.artists, seed.roomNames);
  const guestlist = buildGuestlistData(seed, slug, index * 3);
  const sections = buildTicketSections(
    slug,
    seed.date,
    seed.status,
    seed.ticketPlan,
    seed.guestCount,
  );

  return {
    id: seed.id,
    slug,
    status: seed.status,
    admissionMode: seed.admissionMode ?? "public",
    createdAt: "2030-03-01T10:00:00.000Z",
    updatedAt: `${seed.date}T18:00:00.000Z`,
    organizationId: defaultOrganizationId,
    recruiterProfileId: defaultRecruiterProfileId,
    cover: {
      title: seed.title,
      description: seed.description,
      shortDescription: seed.shortDescription,
      genreDisplayMode: "room",
      date: seed.date,
      time: { start: seed.startTime, end: seed.endTime },
      imageUrl: seed.imageUrl,
      imageAlt: `Original geometric artwork for ${seed.title}`,
      location: locationText,
      venue: venueName,
      capacityTarget: seed.capacityTarget,
      genres: seed.genres,
      type: seed.type,
      roomSize: seed.capacityTarget,
      numberOfRooms: seed.roomNames.length,
      rooms: seed.roomNames.map((name, roomIndex) => ({
        id: `room-${roomIndex + 1}`,
        name,
        capacity: Math.max(
          180,
          Math.round(seed.capacityTarget / (roomIndex + 2)),
        ),
        genres: [seed.genres[roomIndex % seed.genres.length]],
      })),
    },
    lineup: {
      displayMode: "room",
      entries: lineup,
    },
    timetable: {
      startTime: seed.startTime,
      endTime: seed.endTime,
      rows: buildTimetableRows(
        slug,
        lineup,
        seed.startTime,
        seed.endTime,
        seed.roomNames,
        seed.partialDraft,
      ),
    },
    guestlist: {
      accessGroups,
      entries: guestlist.entries,
      summary: guestlist.summary,
    },
    accessAssignments: buildAccessAssignments(seed.id, guestlist.entries),
    applications: [],
    budget: {
      totalBudget: seed.budgetItems.reduce(
        (total, item) => total + item.amount,
        0,
      ),
      doorTicketRevenue: seed.ticketPlan.reduce(
        (total, plan) => total + plan.price * plan.quantitySold,
        0,
      ),
      items: seed.partialDraft
        ? seed.budgetItems.slice(0, 2)
        : seed.budgetItems,
    },
    tickets: {
      tiers: buildTicketTiers(slug, seed.ticketPlan),
      sections,
    },
    labels: buildLabels(),
  };
}

const eventSeeds: DemoEventSeed[] = [
  {
    id: "event-signal-bloom",
    title: "Signal Bloom",
    date: "2030-05-02",
    status: "past",
    description:
      "A fictional three-room opening program moving from warm house selections into luminous techno and a slower closing terrace set.",
    shortDescription:
      "Three rooms of house, techno, and late-night ambient selections.",
    artists: [
      "Mara Vale",
      "Cinder Index",
      "Ivo Quartz",
      "Nia Halcyon",
      "Rook Meridian",
    ],
    genres: ["House", "Techno", "Ambient"],
    startTime: "22:00",
    endTime: "06:00",
    capacityTarget: 1800,
    type: "room",
    roomNames: ["Beacon", "Undertow", "Lookout"],
    imageUrl: "/demo/event-covers/signal-bloom.svg",
    guestCount: 18,
    budgetItems: [
      {
        id: "signal-artist-fees",
        category: "Talent",
        title: "Artist fees",
        amount: 14800,
        paid: true,
      },
      {
        id: "signal-production",
        category: "Production",
        title: "Lighting system",
        amount: 5200,
        paid: true,
      },
      {
        id: "signal-security",
        category: "Operations",
        title: "Door and floor team",
        amount: 3600,
        paid: true,
      },
    ],
    ticketPlan: [
      {
        name: "First Light",
        price: 22,
        quantityAvailable: 400,
        quantitySold: 400,
        status: "sold_out",
      },
      {
        name: "General Release",
        price: 30,
        quantityAvailable: 900,
        quantitySold: 860,
        status: "sold_out",
      },
      {
        name: "VIP Deck",
        price: 68,
        quantityAvailable: 120,
        quantitySold: 104,
        status: "sold_out",
      },
    ],
  },
  {
    id: "event-glass-current",
    title: "Glass Current",
    date: "2030-05-08",
    status: "past",
    description:
      "A fictional midweek program built around crisp electro, broken rhythms, and live hardware performances in two connected rooms.",
    shortDescription: "Electro, breaks, and live hardware across two rooms.",
    artists: ["Aya Kestrel", "North Relay", "Leon Quartz", "Mina Arc"],
    genres: ["Electro", "Breaks", "Techno"],
    startTime: "22:30",
    endTime: "05:30",
    capacityTarget: 1300,
    type: "warehouse",
    roomNames: ["Beacon", "Engine Room"],
    imageUrl: "/demo/event-covers/glass-current.svg",
    guestCount: 14,
    budgetItems: [
      {
        id: "glass-artist-fees",
        category: "Talent",
        title: "Artist fees",
        amount: 11200,
        paid: true,
      },
      {
        id: "glass-backline",
        category: "Production",
        title: "Live backline",
        amount: 3100,
        paid: true,
      },
      {
        id: "glass-staff",
        category: "Operations",
        title: "Venue staff",
        amount: 2900,
        paid: true,
      },
    ],
    ticketPlan: [
      {
        name: "Early Entry",
        price: 18,
        quantityAvailable: 300,
        quantitySold: 300,
        status: "sold_out",
      },
      {
        name: "General Release",
        price: 26,
        quantityAvailable: 700,
        quantitySold: 650,
        status: "sold_out",
      },
      {
        name: "VIP Deck",
        price: 58,
        quantityAvailable: 90,
        quantitySold: 71,
        status: "sold_out",
      },
    ],
  },
  {
    id: "event-midnight-relay",
    title: "Midnight Relay",
    date: "2030-05-10",
    status: "cancelled",
    description:
      "A fictional relay-format event retained in the demo dataset to show explicit cancellation state and historical operations data.",
    shortDescription:
      "A cancelled relay-format program retained for status coverage.",
    artists: ["Orin Wells", "Tess Halo", "Vera Moss"],
    genres: ["Garage", "Bass"],
    startTime: "23:00",
    endTime: "05:00",
    capacityTarget: 900,
    type: "room",
    roomNames: ["Beacon"],
    imageUrl: "/demo/event-covers/midnight-relay.svg",
    guestCount: 4,
    budgetItems: [
      {
        id: "relay-holds",
        category: "Talent",
        title: "Artist holds",
        amount: 4200,
        paid: false,
      },
      {
        id: "relay-refunds",
        category: "Operations",
        title: "Refund administration",
        amount: 800,
        paid: true,
      },
    ],
    ticketPlan: [
      {
        name: "General Release",
        price: 20,
        quantityAvailable: 500,
        quantitySold: 0,
        status: "upcoming",
      },
    ],
  },
  {
    id: "event-lumen-assembly",
    title: "Lumen Assembly",
    date: "2030-05-15",
    status: "live",
    description:
      "Neon Harbor's fictional live showcase connects rolling house in Beacon with deeper modular performances in Undertow.",
    shortDescription: "A live two-room house and modular showcase.",
    artists: [
      "Sage Aster",
      "Rook Meridian",
      "Cleo North",
      "Emil Coast",
      "Nia Halcyon",
    ],
    genres: ["House", "Minimal", "Live Electronic"],
    startTime: "22:00",
    endTime: "06:30",
    capacityTarget: 1700,
    type: "room",
    roomNames: ["Beacon", "Undertow"],
    imageUrl: "/demo/event-covers/lumen-assembly.svg",
    guestCount: 20,
    budgetItems: [
      {
        id: "lumen-artists",
        category: "Talent",
        title: "Artist fees",
        amount: 16200,
        paid: true,
      },
      {
        id: "lumen-visuals",
        category: "Production",
        title: "Generative visuals",
        amount: 4800,
        paid: true,
      },
      {
        id: "lumen-security",
        category: "Operations",
        title: "Security team",
        amount: 3900,
        paid: false,
      },
      {
        id: "lumen-marketing",
        category: "Marketing",
        title: "Launch campaign",
        amount: 2400,
        paid: true,
      },
    ],
    ticketPlan: [
      {
        name: "First Light",
        price: 24,
        quantityAvailable: 350,
        quantitySold: 350,
        status: "sold_out",
      },
      {
        name: "General Release",
        price: 34,
        quantityAvailable: 900,
        quantitySold: 714,
        status: "live",
      },
      {
        name: "Final Release",
        price: 42,
        quantityAvailable: 280,
        quantitySold: 64,
        status: "live",
      },
      {
        name: "VIP Deck",
        price: 78,
        quantityAvailable: 110,
        quantitySold: 83,
        status: "live",
      },
    ],
  },
  {
    id: "event-low-tide-circuit",
    title: "Low Tide Circuit",
    date: "2030-05-22",
    status: "upcoming",
    admissionMode: "curated",
    description:
      "A fictional curated-capacity night for slower techno, dub pressure, and extended sets across the waterfront rooms.",
    shortDescription: "Curated admission for dub pressure and extended sets.",
    artists: ["Mina Arc", "Noel Cinder", "Iris Keene", "Slow Meridian"],
    genres: ["Dub Techno", "Ambient", "Leftfield"],
    startTime: "22:30",
    endTime: "06:00",
    capacityTarget: 1000,
    type: "terrace",
    roomNames: ["Undertow", "Lookout"],
    imageUrl: "/demo/event-covers/low-tide-circuit.svg",
    guestCount: 12,
    budgetItems: [
      {
        id: "tide-artists",
        category: "Talent",
        title: "Artist fees",
        amount: 12800,
        paid: false,
      },
      {
        id: "tide-sound",
        category: "Production",
        title: "Low-frequency system",
        amount: 3900,
        paid: true,
      },
      {
        id: "tide-hospitality",
        category: "Hospitality",
        title: "Artist hospitality",
        amount: 1700,
        paid: false,
      },
    ],
    ticketPlan: [
      {
        name: "Member Release",
        price: 28,
        quantityAvailable: 350,
        quantitySold: 188,
        status: "live",
      },
      {
        name: "General Release",
        price: 36,
        quantityAvailable: 460,
        quantitySold: 0,
        status: "upcoming",
      },
      {
        name: "VIP Deck",
        price: 72,
        quantityAvailable: 70,
        quantitySold: 12,
        status: "live",
      },
    ],
  },
  {
    id: "event-static-garden",
    title: "Static Garden",
    date: "2030-05-29",
    status: "upcoming",
    description:
      "A fictional indoor-outdoor session pairing bright disco edits with leftfield house and a sunrise ambient close.",
    shortDescription:
      "Disco edits, leftfield house, and a sunrise ambient close.",
    artists: ["Zara Bloom", "Jules Arden", "Lina Drift", "The Soft Circuit"],
    genres: ["Disco", "House", "Ambient"],
    startTime: "21:30",
    endTime: "06:00",
    capacityTarget: 1450,
    type: "terrace",
    roomNames: ["Lookout", "Beacon"],
    imageUrl: "/demo/event-covers/static-garden.svg",
    guestCount: 16,
    budgetItems: [
      {
        id: "garden-artists",
        category: "Talent",
        title: "Artist fees",
        amount: 13600,
        paid: false,
      },
      {
        id: "garden-scenic",
        category: "Production",
        title: "Scenic installation",
        amount: 4200,
        paid: false,
      },
      {
        id: "garden-campaign",
        category: "Marketing",
        title: "Campaign production",
        amount: 1800,
        paid: true,
      },
    ],
    ticketPlan: [
      {
        name: "First Light",
        price: 20,
        quantityAvailable: 300,
        quantitySold: 300,
        status: "sold_out",
      },
      {
        name: "General Release",
        price: 29,
        quantityAvailable: 780,
        quantitySold: 295,
        status: "live",
      },
      {
        name: "VIP Deck",
        price: 64,
        quantityAvailable: 100,
        quantitySold: 18,
        status: "live",
      },
    ],
  },
  {
    id: "event-parallel-rooms",
    title: "Parallel Rooms",
    date: "2030-06-05",
    status: "upcoming",
    description:
      "A fictional multi-room program designed to demonstrate room assignments, overlapping timetables, and cross-room artist appearances.",
    shortDescription:
      "A three-room program with overlapping sets and shared artists.",
    artists: [
      "Avery Vale",
      "Leon Quartz",
      "Nora Venn",
      "Remy Frost",
      "Mara Dune",
      "Ivo Slate",
    ],
    genres: ["Techno", "Electro", "Bass"],
    startTime: "22:00",
    endTime: "07:00",
    capacityTarget: 1900,
    type: "warehouse",
    roomNames: ["Beacon", "Undertow", "Engine Room"],
    imageUrl: "/demo/event-covers/parallel-rooms.svg",
    guestCount: 15,
    budgetItems: [
      {
        id: "parallel-artists",
        category: "Talent",
        title: "Artist fees",
        amount: 18400,
        paid: false,
      },
      {
        id: "parallel-audio",
        category: "Production",
        title: "Three-room audio package",
        amount: 6100,
        paid: false,
      },
      {
        id: "parallel-ops",
        category: "Operations",
        title: "Room operations",
        amount: 4500,
        paid: false,
      },
    ],
    ticketPlan: [
      {
        name: "First Light",
        price: 26,
        quantityAvailable: 380,
        quantitySold: 226,
        status: "live",
      },
      {
        name: "General Release",
        price: 35,
        quantityAvailable: 920,
        quantitySold: 0,
        status: "upcoming",
      },
      {
        name: "Final Release",
        price: 44,
        quantityAvailable: 320,
        quantitySold: 0,
        status: "upcoming",
      },
      {
        name: "VIP Deck",
        price: 82,
        quantityAvailable: 120,
        quantitySold: 9,
        status: "live",
      },
    ],
  },
  {
    id: "event-meridian-draft",
    title: "Meridian Draft",
    date: "2030-06-12",
    status: "draft",
    description:
      "A fictional work-in-progress event retained to demonstrate editable draft sections and incomplete operational planning.",
    shortDescription:
      "A work-in-progress draft for editor workflow demonstrations.",
    artists: ["Mara Vale", "Aya Kestrel", "Rook Meridian"],
    genres: ["House", "Techno"],
    startTime: "22:00",
    endTime: "05:30",
    capacityTarget: 1200,
    type: "room",
    roomNames: ["Beacon", "Undertow"],
    imageUrl: "/demo/event-covers/meridian-draft.svg",
    guestCount: 3,
    partialDraft: true,
    budgetItems: [
      {
        id: "draft-artists",
        category: "Talent",
        title: "Artist holds",
        amount: 7200,
        paid: false,
      },
      {
        id: "draft-production",
        category: "Production",
        title: "Production estimate",
        amount: 3400,
        paid: false,
      },
      {
        id: "draft-staff",
        category: "Operations",
        title: "Staffing estimate",
        amount: 2400,
        paid: false,
      },
    ],
    ticketPlan: [
      {
        name: "First Light",
        price: 22,
        quantityAvailable: 250,
        quantitySold: 0,
        status: "upcoming",
      },
      {
        name: "General Release",
        price: 30,
        quantityAvailable: 650,
        quantitySold: 0,
        status: "upcoming",
      },
    ],
  },
];

export const demoEvents: Event[] = eventSeeds.map(buildEvent);

export const defaultConsumerUserId = demoUsers[0]?.id ?? "consumer-1";

const defaultWalletEntries: ConsumerUser["ticketWalletEntries"] = [
  {
    eventSlug: "lumen-assembly-2030-05-15",
    quantity: 2,
    accessGroupId: "group-regular-entry",
    ticketLabel: "General Release",
    status: "active",
  },
  {
    eventSlug: "low-tide-circuit-2030-05-22",
    quantity: 1,
    accessGroupId: "group-vip",
    ticketLabel: "VIP Deck",
    status: "active",
  },
  {
    eventSlug: "signal-bloom-2030-05-02",
    quantity: 1,
    accessGroupId: "group-regular-entry",
    ticketLabel: "General Release",
    status: "scanned",
  },
];

function attachDefaultConsumerAccess(event: Event) {
  const walletEntry = defaultWalletEntries?.find(
    (entry) => entry.eventSlug === event.slug,
  );
  if (!walletEntry) {
    return event;
  }

  return syncTicketPurchaseToEvent(event, {
    userId: defaultConsumerUserId,
    accessGroupId: walletEntry.accessGroupId,
    purchasedAt: "2030-04-10T18:30:00.000Z",
    checkedIn: walletEntry.status === "scanned",
  });
}

export const syncedDemoEvents = demoEvents.map(attachDefaultConsumerAccess);

export const demoUsersWithWallet: ConsumerUser[] = demoUsers.map(
  (user, index) => {
    if (index !== 0) {
      return user;
    }

    return {
      ...user,
      username: "avery-vale",
      email: "avery.vale@example.test",
      city: "Northport",
      favoriteGenres: ["House", "Techno", "Ambient"],
      savedEventSlugs: [
        "static-garden-2030-05-29",
        "parallel-rooms-2030-06-05",
      ],
      upcomingTicketEventSlugs: [
        "lumen-assembly-2030-05-15",
        "low-tide-circuit-2030-05-22",
      ],
      pastTicketEventSlugs: ["signal-bloom-2030-05-02"],
      ticketWalletEntries: defaultWalletEntries?.map((entry) => ({ ...entry })),
    };
  },
);

export const demoTicketOrders: DemoTicketOrderSeed[] = [
  {
    eventId: "event-signal-bloom",
    consumerUserId: "consumer-1",
    ticketSectionId: "signal-bloom-2030-05-02-section-regular-entry",
    ticketPhaseId: "signal-bloom-2030-05-02-ticket-general-release",
    quantity: 1,
    unitPrice: 30,
  },
  {
    eventId: "event-glass-current",
    consumerUserId: "consumer-4",
    ticketSectionId: "glass-current-2030-05-08-section-regular-entry",
    ticketPhaseId: "glass-current-2030-05-08-ticket-general-release",
    quantity: 2,
    unitPrice: 26,
  },
  {
    eventId: "event-lumen-assembly",
    consumerUserId: "consumer-1",
    ticketSectionId: "lumen-assembly-2030-05-15-section-regular-entry",
    ticketPhaseId: "lumen-assembly-2030-05-15-ticket-general-release",
    quantity: 2,
    unitPrice: 34,
  },
  {
    eventId: "event-lumen-assembly",
    consumerUserId: "consumer-10",
    ticketSectionId: "lumen-assembly-2030-05-15-section-vip",
    ticketPhaseId: "lumen-assembly-2030-05-15-ticket-vip-deck",
    quantity: 1,
    unitPrice: 78,
  },
  {
    eventId: "event-low-tide-circuit",
    consumerUserId: "consumer-1",
    ticketSectionId: "low-tide-circuit-2030-05-22-section-vip",
    ticketPhaseId: "low-tide-circuit-2030-05-22-ticket-vip-deck",
    quantity: 1,
    unitPrice: 72,
  },
  {
    eventId: "event-static-garden",
    consumerUserId: "consumer-16",
    ticketSectionId: "static-garden-2030-05-29-section-vip",
    ticketPhaseId: "static-garden-2030-05-29-ticket-vip-deck",
    quantity: 1,
    unitPrice: 64,
  },
  {
    eventId: "event-parallel-rooms",
    consumerUserId: "consumer-19",
    ticketSectionId: "parallel-rooms-2030-06-05-section-vip",
    ticketPhaseId: "parallel-rooms-2030-06-05-ticket-vip-deck",
    quantity: 1,
    unitPrice: 82,
  },
];

export const demoRecruiterProfile: RecruiterProfile = {
  id: defaultRecruiterProfileId,
  organizationId: defaultOrganizationId,
  slug: "neon-harbor",
  recruiterType: "nightclub",
  displayName: venueName,
  realName: "Neon Harbor Demo Organization",
  media: {
    avatarImageUrl: "/demo/profiles/neon-harbor-avatar.svg",
    bannerImageUrl: "/demo/profiles/neon-harbor-banner.svg",
  },
  bio: "Neon Harbor is a fictional waterfront venue created for the KUSPACE public demo. Its program spans house, techno, electro, ambient, and bass across three configurable rooms.",
  location: {
    displayText: "Northport Waterfront",
  },
  soundProfile: {
    genres: ["House", "Techno", "Electro", "Ambient", "Bass"],
    roomSize: 1900,
    roomCount: 3,
    rooms: [
      { name: "Beacon", capacity: 950 },
      { name: "Undertow", capacity: 600 },
      { name: "Lookout", capacity: 350 },
    ],
  },
  links: {
    email: "events@neonharbor.example.test",
    website: "https://neonharbor.example.test",
  },
  canFollow: true,
  stats: {
    eventsHeld: 42,
    citiesActive: 1,
    followers: 6800,
    publicRating: 4.8,
    display: {
      eventsHeld: true,
      citiesActive: true,
      followers: true,
      publicRating: true,
    },
  },
  events: {
    upcoming: syncedDemoEvents.filter(
      (event) => event.status === "live" || event.status === "upcoming",
    ),
    past: syncedDemoEvents.filter((event) => event.status === "past"),
  },
};

export const demoArtists: ArtistProfile[] = Array.from(
  new Map(
    syncedDemoEvents
      .flatMap((event) => event.lineup.entries)
      .map((entry) => [
        entry.artistId,
        {
          id: entry.artistId,
          name: entry.name,
        } satisfies ArtistProfile,
      ]),
  ).values(),
).sort((left, right) => left.name.localeCompare(right.name));

export const initialDemoState = {
  profile: demoRecruiterProfile,
  users: demoUsersWithWallet,
  artists: demoArtists,
  events: syncedDemoEvents,
};
