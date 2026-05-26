import { Prisma } from "@prisma/client";
import type { ArtistProfile, Event, EventApplication, GuestlistEntry, TicketSection } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import type { ConsumerUser } from "@/types/user";
import { getPublicEventWhereInput } from "@/lib/event-status";
import { prisma } from "@/lib/prisma";

const DRAFT_DATE_SENTINEL = "1970-01-01";

const recruiterProfileInclude = {
  stats: true,
  soundProfile: {
    include: {
      genres: {
        orderBy: { sortOrder: "asc" },
      },
      rooms: {
        orderBy: { sortOrder: "asc" },
      },
    },
  },
} satisfies Prisma.RecruiterProfileInclude;

const consumerUserInclude = {
  favoriteGenres: {
    orderBy: { sortOrder: "asc" },
  },
  savedEvents: true,
  upcomingTicketEvents: true,
  pastTicketEvents: true,
  ticketWalletEntries: {
    include: {
      accessGroup: true,
    },
  },
} satisfies Prisma.ConsumerUserInclude;

const eventInclude = {
  genres: {
    orderBy: { sortOrder: "asc" },
  },
  rooms: {
    orderBy: { sortOrder: "asc" },
    include: {
      genres: {
        orderBy: { sortOrder: "asc" },
      },
    },
  },
  lineupEntries: {
    orderBy: { sortOrder: "asc" },
    include: {
      roomLinks: {
        include: {
          eventRoom: true,
        },
      },
    },
  },
  timetableRows: {
    orderBy: { sortOrder: "asc" },
    include: {
      eventRoom: true,
      lineupEntry: true,
    },
  },
  accessGroups: {
    orderBy: { sortOrder: "asc" },
  },
  accessAssignments: {
    include: {
      accessGroup: true,
    },
  },
  applications: {
    include: {
      accessGroup: true,
    },
  },
  guestlistEntries: {
    orderBy: { createdAt: "asc" },
    include: {
      accessGroup: true,
    },
  },
  budgetItems: {
    orderBy: { sortOrder: "asc" },
  },
  ticketSections: {
    orderBy: { sortOrder: "asc" },
    include: {
      accessGroup: true,
      allowedGroups: {
        include: {
          accessGroup: true,
        },
      },
      phases: {
        orderBy: { sortOrder: "asc" },
      },
    },
  },
  labelLinks: {
    orderBy: { sortOrder: "asc" },
    include: {
      eventLabel: true,
    },
  },
} satisfies Prisma.EventInclude;

function toDateOrNull(value?: string) {
  if (!value) {
    return null;
  }

  return new Date(value);
}

function toDateOnlyOrSentinel(value?: string) {
  if (!value) {
    return new Date(`${DRAFT_DATE_SENTINEL}T00:00:00.000Z`);
  }

  return new Date(`${value}T00:00:00.000Z`);
}

function fromDateOnly(value: Date, status: Event["status"]) {
  const iso = value.toISOString().slice(0, 10);
  if (status === "draft" && iso === DRAFT_DATE_SENTINEL) {
    return "";
  }

  return iso;
}

function nullableString(value?: string) {
  return value && value.trim().length > 0 ? value : null;
}

function toEventScopedId(eventId: string, clientKey: string) {
  return `${eventId}:${clientKey}`;
}

function getDefaultOrganizationIdForRecruiterProfile(profileId: string) {
  return `organization-${profileId}`;
}

function getOrganizationTypeForRecruiterType(recruiterType: RecruiterProfile["recruiterType"]) {
  return recruiterType === "label" ? "label" : "nightclub";
}

function deriveGuestlistSummary(entries: GuestlistEntry[]) {
  return {
    ticketsSold: entries.filter((entry) => entry.source === "user").length,
    manualGuests: entries.filter((entry) => entry.source === "manual").length,
    totalAttending: entries.length,
  };
}

function mapRecruiterProfileModel(
  profile: Prisma.RecruiterProfileGetPayload<{ include: typeof recruiterProfileInclude }>,
  events: Event[] = [],
): RecruiterProfile {
  return {
    id: profile.id,
    clerkUserId: profile.clerkUserId ?? undefined,
    organizationId: profile.organizationId ?? undefined,
    slug: profile.slug,
    recruiterType: profile.recruiterType,
    realName: profile.realName ?? undefined,
    displayName: profile.displayName,
    media: {
      avatarImageUrl: profile.avatarImageUrl ?? undefined,
      bannerImageUrl: profile.bannerImageUrl ?? undefined,
    },
    bio: profile.bio ?? undefined,
    location: profile.locationDisplayText
      ? { displayText: profile.locationDisplayText }
      : undefined,
    soundProfile: profile.soundProfile
      ? {
          genres: profile.soundProfile.genres.map((genre) => genre.value),
          roomSize: profile.soundProfile.roomSize ?? undefined,
          roomCount: profile.soundProfile.roomCount ?? undefined,
          rooms: profile.soundProfile.rooms.map((room) => ({
            name: room.name,
            capacity: room.capacity,
          })),
        }
      : undefined,
    links: {
      instagram: profile.instagram ?? undefined,
      soundcloud: profile.soundcloud ?? undefined,
      spotify: profile.spotify ?? undefined,
      residentAdvisor: profile.residentAdvisor ?? undefined,
      website: profile.website ?? undefined,
      email: profile.email ?? undefined,
      mapsLocation: profile.mapsLocation ?? undefined,
    },
    canFollow: profile.canFollow ?? undefined,
    stats: profile.stats
      ? {
          eventsHeld: profile.stats.eventsHeld ?? undefined,
          citiesActive: profile.stats.citiesActive ?? undefined,
          followers: profile.stats.followers ?? undefined,
          publicRating: profile.stats.publicRating ?? undefined,
          display: {
            eventsHeld: profile.stats.displayEventsHeld,
            citiesActive: profile.stats.displayCitiesActive,
            followers: profile.stats.displayFollowers,
            publicRating: profile.stats.displayPublicRating,
          },
        }
      : undefined,
    events:
      events.length > 0
        ? {
            upcoming: events.filter((event) => event.status === "live" || event.status === "upcoming"),
            past: events.filter((event) => event.status === "past"),
          }
        : undefined,
  };
}

function mapConsumerUserModel(
  user: Prisma.ConsumerUserGetPayload<{ include: typeof consumerUserInclude }>,
): ConsumerUser {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber ?? undefined,
    avatarImageUrl: user.avatarImageUrl ?? undefined,
    city: user.city ?? undefined,
    birthdate: user.birthdate?.toISOString() ?? undefined,
    profileVisibility: user.profileVisibility ?? undefined,
    notificationsEnabled: user.notificationsEnabled ?? undefined,
    favoriteGenres: user.favoriteGenres.map((genre) => genre.value),
    savedEventSlugs: user.savedEvents.map((event) => event.eventSlug),
    upcomingTicketEventSlugs: user.upcomingTicketEvents.map((event) => event.eventSlug),
    pastTicketEventSlugs: user.pastTicketEvents.map((event) => event.eventSlug),
    ticketWalletEntries: user.ticketWalletEntries.map((entry) => ({
      eventSlug: entry.eventSlug,
      quantity: entry.quantity,
      accessGroupId: entry.accessGroup.clientKey ?? entry.accessGroupId,
      ticketLabel: entry.ticketLabel ?? undefined,
      status: entry.status ?? undefined,
    })),
    createdAt: user.createdAt.toISOString(),
  };
}

function mapEventModel(
  event: Prisma.EventGetPayload<{ include: typeof eventInclude }>,
): Event {
  const guestlistEntries: GuestlistEntry[] = event.guestlistEntries.map((entry) =>
    entry.source === "user" && entry.consumerUserId
      ? {
          id: entry.id,
          source: "user",
          accessGroupId: entry.accessGroup.clientKey ?? entry.accessGroupId,
          userId: entry.consumerUserId,
          checkedIn: entry.checkedIn,
          createdAt: entry.createdAt.toISOString(),
        }
      : {
          id: entry.id,
          source: "manual",
          accessGroupId: entry.accessGroup.clientKey ?? entry.accessGroupId,
          firstName: entry.firstName ?? "",
          lastName: entry.lastName ?? "",
          userId: entry.consumerUserId ?? undefined,
          checkedIn: entry.checkedIn,
          createdAt: entry.createdAt.toISOString(),
          notes: entry.notes ?? undefined,
        },
  );

  const sections: TicketSection[] = event.ticketSections.map((section) => ({
    id: section.id,
    name: section.name,
    visibility: section.visibility,
    accessGroupId: section.accessGroup.clientKey ?? section.accessGroupId,
    allowedGroupIds: section.allowedGroups.map((group) => group.accessGroup.clientKey ?? group.accessGroupId),
    phases: section.phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      price: Number(phase.price),
      quantityAvailable: phase.quantityAvailable,
      quantitySold: phase.quantitySold,
      visibility: phase.visibility,
      status: phase.status,
      sortOrder: phase.sortOrder,
      salesStart: phase.salesStart?.toISOString() ?? undefined,
      salesEnd: phase.salesEnd?.toISOString() ?? undefined,
      releaseMode: phase.releaseMode ?? undefined,
      releaseAfterTierId: phase.releaseAfterTierId ?? undefined,
    })),
  }));

  return {
    id: event.id,
    slug: event.slug,
    status: event.status,
    admissionMode: event.admissionMode,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    organizationId: event.organizationId,
    recruiterProfileId: event.recruiterProfileId,
    cover: {
      title: event.title,
      description: event.description ?? "",
      shortDescription: event.shortDescription ?? "",
      genreDisplayMode: event.genreDisplayMode ?? undefined,
      date: fromDateOnly(event.date, event.status),
      time: {
        start: event.timeStart ?? "",
        end: event.timeEnd ?? "",
      },
      imageUrl: event.imageUrl,
      imageAlt: event.imageAlt,
      location: event.location,
      venue: event.venue,
      capacityTarget: event.capacityTarget,
      genres: event.genres.map((genre) => genre.value),
      type: event.eventType,
      roomSize: event.roomSize,
      numberOfRooms: event.numberOfRooms ?? 0,
      rooms: event.rooms.map((room) => ({
        id: room.clientKey ?? room.id,
        name: room.name,
        capacity: room.capacity,
        genres: room.genres.map((genre) => genre.value),
      })),
    },
    lineup: {
      displayMode: event.lineupDisplayMode ?? "event",
      entries: event.lineupEntries.map((entry) => {
        const roomIds = entry.roomLinks.map((link) => link.eventRoom.clientKey ?? link.eventRoomId);

        return {
          id: entry.clientKey ?? entry.id,
          artistId: entry.artistId,
          name: entry.name,
          kind: entry.kind ?? undefined,
          roomId: roomIds[0] ?? undefined,
          roomIds: roomIds.length > 0 ? roomIds : undefined,
        };
      }),
    },
    timetable: {
      startTime: event.timetableStartTime ?? "",
      endTime: event.timetableEndTime ?? "",
      rows: event.timetableRows.map((row) => ({
        id: row.clientKey ?? row.id,
        title: row.title,
        lineupEntryId: row.lineupEntry?.clientKey ?? row.lineupEntryId ?? undefined,
        room: row.eventRoom?.clientKey ?? row.roomName ?? undefined,
        notes: row.notes ?? undefined,
        startTime: row.startTime,
        endTime: row.endTime,
        sortOrder: row.sortOrder,
      })),
    },
    guestlist: {
      accessGroups: event.accessGroups.map((group) => ({
        id: group.clientKey ?? group.id,
        name: group.name,
      })),
      entries: guestlistEntries,
      summary: deriveGuestlistSummary(guestlistEntries),
    },
    accessAssignments: event.accessAssignments.map((assignment) => ({
      eventId: assignment.eventId,
      userId: assignment.consumerUserId,
      accessGroupId: assignment.accessGroup.clientKey ?? assignment.accessGroupId,
      source: assignment.source,
      paymentState: assignment.paymentState,
      checkedIn: assignment.checkedIn,
      assignedAt: assignment.assignedAt?.toISOString() ?? undefined,
      assignedBy: assignment.assignedBy ?? undefined,
      notes: assignment.notes ?? undefined,
    })),
    applications: event.applications.map((application) => ({
      eventId: application.eventId,
      userId: application.consumerUserId,
      status: application.status,
      appliedAt: application.appliedAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString() ?? undefined,
      reviewedBy: application.reviewedBy ?? undefined,
      accessGroupId: application.accessGroup?.clientKey ?? application.accessGroupId ?? undefined,
      notes: application.notes ?? undefined,
    })),
    budget: {
      totalBudget: Number(event.totalBudget),
      doorTicketRevenue: Number(event.doorTicketRevenue),
      items: event.budgetItems.map((item) => ({
        id: item.clientKey ?? item.id,
        category: item.category,
        title: item.title,
        amount: Number(item.amount),
        paid: item.paid,
        notes: item.notes ?? undefined,
      })),
    },
    tickets: {
      tiers: sections.flatMap((section) => section.phases),
      sections,
    },
    labels: event.labelLinks.map((link) => ({
      id: link.eventLabel.id,
      name: link.eventLabel.name,
      profileSlug: link.eventLabel.profileSlug ?? undefined,
      avatarImageUrl: link.eventLabel.avatarImageUrl ?? undefined,
    })),
  };
}

function deriveArtists(events: Event[]): ArtistProfile[] {
  return Array.from(
    new Map(
      events
        .flatMap((event) => event.lineup.entries)
        .map((entry) => [entry.artistId, { id: entry.artistId, name: entry.name } satisfies ArtistProfile]),
    ).values(),
  ).sort((left, right) => left.name.localeCompare(right.name));
}

async function ensureAccessGroups(tx: Prisma.TransactionClient, event: Event) {
  for (const [index, group] of event.guestlist.accessGroups.entries()) {
    const accessGroupId = toEventScopedId(event.id, group.id);

    await tx.accessGroup.upsert({
      where: { id: accessGroupId },
      create: {
        id: accessGroupId,
        eventId: event.id,
        clientKey: group.id,
        name: group.name,
        sortOrder: index,
      },
      update: {
        eventId: event.id,
        clientKey: group.id,
        name: group.name,
        sortOrder: index,
      },
    });
  }
}

export async function clearDatabase() {
  await prisma.consumerTicketWalletEntry.deleteMany();
  await prisma.consumerUserSavedEvent.deleteMany();
  await prisma.consumerUserUpcomingTicketEvent.deleteMany();
  await prisma.consumerUserPastTicketEvent.deleteMany();
  await prisma.consumerUserFavoriteGenre.deleteMany();
  await prisma.eventLabelLink.deleteMany();
  await prisma.eventLabel.deleteMany();
  await prisma.ticketTier.deleteMany();
  await prisma.ticketSectionAllowedGroup.deleteMany();
  await prisma.ticketSection.deleteMany();
  await prisma.budgetItem.deleteMany();
  await prisma.guestlistEntry.deleteMany();
  await prisma.eventApplication.deleteMany();
  await prisma.eventAccessAssignment.deleteMany();
  await prisma.accessGroup.deleteMany();
  await prisma.timetableRow.deleteMany();
  await prisma.lineupEntryRoom.deleteMany();
  await prisma.lineupEntry.deleteMany();
  await prisma.eventRoomGenre.deleteMany();
  await prisma.eventRoom.deleteMany();
  await prisma.eventGenre.deleteMany();
  await prisma.event.deleteMany();
  await prisma.recruiterSoundProfileGenre.deleteMany();
  await prisma.recruiterSoundProfileRoom.deleteMany();
  await prisma.recruiterSoundProfile.deleteMany();
  await prisma.recruiterProfileStats.deleteMany();
  await prisma.consumerUser.deleteMany();
  await prisma.recruiterProfile.deleteMany();
  await prisma.organizationMembership.deleteMany();
  await prisma.organization.deleteMany();
}

export async function saveRecruiterProfile(profile: RecruiterProfile) {
  const organizationId = profile.organizationId ?? getDefaultOrganizationIdForRecruiterProfile(profile.id);

  await prisma.organization.upsert({
    where: { id: organizationId },
    create: {
      id: organizationId,
      slug: profile.slug,
      name: profile.displayName,
      type: getOrganizationTypeForRecruiterType(profile.recruiterType),
    },
    update: {
      slug: profile.slug,
      name: profile.displayName,
      type: getOrganizationTypeForRecruiterType(profile.recruiterType),
    },
  });

  await prisma.recruiterProfile.upsert({
    where: { id: profile.id },
    create: {
      id: profile.id,
      clerkUserId: nullableString(profile.clerkUserId) ?? undefined,
      organizationId,
      slug: profile.slug,
      recruiterType: profile.recruiterType,
      realName: nullableString(profile.realName) ?? undefined,
      displayName: profile.displayName,
      avatarImageUrl: nullableString(profile.media?.avatarImageUrl) ?? undefined,
      bannerImageUrl: nullableString(profile.media?.bannerImageUrl) ?? undefined,
      bio: nullableString(profile.bio) ?? undefined,
      locationDisplayText: nullableString(profile.location?.displayText) ?? undefined,
      canFollow: profile.canFollow ?? undefined,
      instagram: nullableString(profile.links?.instagram) ?? undefined,
      soundcloud: nullableString(profile.links?.soundcloud) ?? undefined,
      spotify: nullableString(profile.links?.spotify) ?? undefined,
      residentAdvisor: nullableString(profile.links?.residentAdvisor) ?? undefined,
      website: nullableString(profile.links?.website) ?? undefined,
      email: nullableString(profile.links?.email) ?? undefined,
      mapsLocation: nullableString(profile.links?.mapsLocation) ?? undefined,
    },
    update: {
      clerkUserId: nullableString(profile.clerkUserId) ?? undefined,
      organizationId,
      slug: profile.slug,
      recruiterType: profile.recruiterType,
      realName: nullableString(profile.realName) ?? undefined,
      displayName: profile.displayName,
      avatarImageUrl: nullableString(profile.media?.avatarImageUrl) ?? undefined,
      bannerImageUrl: nullableString(profile.media?.bannerImageUrl) ?? undefined,
      bio: nullableString(profile.bio) ?? undefined,
      locationDisplayText: nullableString(profile.location?.displayText) ?? undefined,
      canFollow: profile.canFollow ?? undefined,
      instagram: nullableString(profile.links?.instagram) ?? undefined,
      soundcloud: nullableString(profile.links?.soundcloud) ?? undefined,
      spotify: nullableString(profile.links?.spotify) ?? undefined,
      residentAdvisor: nullableString(profile.links?.residentAdvisor) ?? undefined,
      website: nullableString(profile.links?.website) ?? undefined,
      email: nullableString(profile.links?.email) ?? undefined,
      mapsLocation: nullableString(profile.links?.mapsLocation) ?? undefined,
    },
  });

  if (profile.stats) {
    await prisma.recruiterProfileStats.upsert({
      where: { recruiterProfileId: profile.id },
      create: {
        recruiterProfileId: profile.id,
        eventsHeld: profile.stats.eventsHeld ?? undefined,
        citiesActive: profile.stats.citiesActive ?? undefined,
        followers: profile.stats.followers ?? undefined,
        publicRating: profile.stats.publicRating ?? undefined,
        displayEventsHeld: profile.stats.display.eventsHeld,
        displayCitiesActive: profile.stats.display.citiesActive,
        displayFollowers: profile.stats.display.followers,
        displayPublicRating: profile.stats.display.publicRating,
      },
      update: {
        eventsHeld: profile.stats.eventsHeld ?? undefined,
        citiesActive: profile.stats.citiesActive ?? undefined,
        followers: profile.stats.followers ?? undefined,
        publicRating: profile.stats.publicRating ?? undefined,
        displayEventsHeld: profile.stats.display.eventsHeld,
        displayCitiesActive: profile.stats.display.citiesActive,
        displayFollowers: profile.stats.display.followers,
        displayPublicRating: profile.stats.display.publicRating,
      },
    });
  }

  if (profile.soundProfile) {
    const soundProfile = await prisma.recruiterSoundProfile.upsert({
      where: { recruiterProfileId: profile.id },
      create: {
        recruiterProfileId: profile.id,
        roomSize: profile.soundProfile.roomSize ?? undefined,
        roomCount: profile.soundProfile.roomCount ?? undefined,
      },
      update: {
        roomSize: profile.soundProfile.roomSize ?? undefined,
        roomCount: profile.soundProfile.roomCount ?? undefined,
      },
    });

    await prisma.recruiterSoundProfileGenre.deleteMany({
      where: { recruiterSoundProfileId: soundProfile.id },
    });
    await prisma.recruiterSoundProfileRoom.deleteMany({
      where: { recruiterSoundProfileId: soundProfile.id },
    });

    if (profile.soundProfile.genres.length > 0) {
      await prisma.recruiterSoundProfileGenre.createMany({
        data: profile.soundProfile.genres.map((genre, index) => ({
          recruiterSoundProfileId: soundProfile.id,
          value: genre,
          sortOrder: index,
        })),
      });
    }

    if ((profile.soundProfile.rooms ?? []).length > 0) {
      await prisma.recruiterSoundProfileRoom.createMany({
        data: (profile.soundProfile.rooms ?? []).map((room, index) => ({
          recruiterSoundProfileId: soundProfile.id,
          name: room.name,
          capacity: room.capacity,
          sortOrder: index,
        })),
      });
    }
  }
}

export async function saveConsumerUser(user: ConsumerUser) {
  const walletAccessGroupIds = new Map<string, string>();

  if ((user.ticketWalletEntries ?? []).length > 0) {
    const walletEvents = await prisma.event.findMany({
      where: {
        slug: {
          in: Array.from(new Set((user.ticketWalletEntries ?? []).map((entry) => entry.eventSlug))),
        },
      },
      include: {
        accessGroups: true,
      },
    });

    for (const event of walletEvents) {
      for (const group of event.accessGroups) {
        walletAccessGroupIds.set(`${event.slug}:${group.clientKey ?? group.id}`, group.id);
      }
    }
  }

  await prisma.consumerUser.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      username: user.username.toLowerCase(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: nullableString(user.phoneNumber) ?? undefined,
      avatarImageUrl: nullableString(user.avatarImageUrl) ?? undefined,
      city: nullableString(user.city) ?? undefined,
      birthdate: toDateOrNull(user.birthdate) ?? undefined,
      profileVisibility: user.profileVisibility ?? undefined,
      notificationsEnabled: user.notificationsEnabled ?? undefined,
      createdAt: new Date(user.createdAt),
    },
    update: {
      username: user.username.toLowerCase(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: nullableString(user.phoneNumber) ?? undefined,
      avatarImageUrl: nullableString(user.avatarImageUrl) ?? undefined,
      city: nullableString(user.city) ?? undefined,
      birthdate: toDateOrNull(user.birthdate) ?? undefined,
      profileVisibility: user.profileVisibility ?? undefined,
      notificationsEnabled: user.notificationsEnabled ?? undefined,
    },
  });

  await prisma.consumerUserFavoriteGenre.deleteMany({ where: { consumerUserId: user.id } });
  await prisma.consumerUserSavedEvent.deleteMany({ where: { consumerUserId: user.id } });
  await prisma.consumerUserUpcomingTicketEvent.deleteMany({ where: { consumerUserId: user.id } });
  await prisma.consumerUserPastTicketEvent.deleteMany({ where: { consumerUserId: user.id } });
  await prisma.consumerTicketWalletEntry.deleteMany({ where: { consumerUserId: user.id } });

  if ((user.favoriteGenres ?? []).length > 0) {
    await prisma.consumerUserFavoriteGenre.createMany({
      data: (user.favoriteGenres ?? []).map((genre, index) => ({
        consumerUserId: user.id,
        value: genre,
        sortOrder: index,
      })),
    });
  }

  if ((user.savedEventSlugs ?? []).length > 0) {
    await prisma.consumerUserSavedEvent.createMany({
      data: (user.savedEventSlugs ?? []).map((eventSlug) => ({
        consumerUserId: user.id,
        eventSlug,
      })),
    });
  }

  if ((user.upcomingTicketEventSlugs ?? []).length > 0) {
    await prisma.consumerUserUpcomingTicketEvent.createMany({
      data: (user.upcomingTicketEventSlugs ?? []).map((eventSlug) => ({
        consumerUserId: user.id,
        eventSlug,
      })),
    });
  }

  if ((user.pastTicketEventSlugs ?? []).length > 0) {
    await prisma.consumerUserPastTicketEvent.createMany({
      data: (user.pastTicketEventSlugs ?? []).map((eventSlug) => ({
        consumerUserId: user.id,
        eventSlug,
      })),
    });
  }

  if ((user.ticketWalletEntries ?? []).length > 0) {
    await prisma.consumerTicketWalletEntry.createMany({
      data: (user.ticketWalletEntries ?? []).map((entry) => ({
        consumerUserId: user.id,
        eventSlug: entry.eventSlug,
        accessGroupId:
          walletAccessGroupIds.get(`${entry.eventSlug}:${entry.accessGroupId}`) ??
          entry.accessGroupId,
        quantity: entry.quantity,
        ticketLabel: nullableString(entry.ticketLabel) ?? undefined,
        status: entry.status ?? undefined,
      })),
    });
  }

  return getConsumerUserById(user.id);
}

export async function saveEventAggregate(event: Event) {
  await prisma.$transaction(async (tx) => {
    const roomReferenceToId = new Map<string, string>();
    const accessGroupReferenceToId = new Map<string, string>();
    const lineupEntryReferenceToId = new Map<string, string>();

    for (const room of event.cover.rooms ?? []) {
      const dbRoomId = toEventScopedId(event.id, room.id);
      roomReferenceToId.set(room.id, dbRoomId);
      roomReferenceToId.set(room.name, dbRoomId);
    }

    for (const group of event.guestlist.accessGroups) {
      const dbAccessGroupId = toEventScopedId(event.id, group.id);
      accessGroupReferenceToId.set(group.id, dbAccessGroupId);
      accessGroupReferenceToId.set(group.name, dbAccessGroupId);
    }

    for (const entry of event.lineup.entries) {
      lineupEntryReferenceToId.set(entry.id, toEventScopedId(event.id, entry.id));
    }

    let organizationId = event.organizationId;

    if (!organizationId) {
      const recruiterProfile = await tx.recruiterProfile.findUnique({
        where: { id: event.recruiterProfileId },
        select: {
          id: true,
          organizationId: true,
          slug: true,
          displayName: true,
          recruiterType: true,
        },
      });

      if (!recruiterProfile) {
        throw new Error(`Recruiter profile ${event.recruiterProfileId} not found while saving event ${event.id}.`);
      }

      organizationId = recruiterProfile.organizationId ?? getDefaultOrganizationIdForRecruiterProfile(recruiterProfile.id);

      await tx.organization.upsert({
        where: { id: organizationId },
        create: {
          id: organizationId,
          slug: recruiterProfile.slug,
          name: recruiterProfile.displayName,
          type: getOrganizationTypeForRecruiterType(recruiterProfile.recruiterType),
        },
        update: {
          slug: recruiterProfile.slug,
          name: recruiterProfile.displayName,
          type: getOrganizationTypeForRecruiterType(recruiterProfile.recruiterType),
        },
      });

      if (!recruiterProfile.organizationId) {
        await tx.recruiterProfile.update({
          where: { id: recruiterProfile.id },
          data: { organizationId },
        });
      }
    }

    await tx.event.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        slug: event.slug,
        status: event.status,
        admissionMode: event.admissionMode,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
        organizationId,
        recruiterProfileId: event.recruiterProfileId,
        title: event.cover.title,
        description: nullableString(event.cover.description) ?? undefined,
        shortDescription: nullableString(event.cover.shortDescription) ?? undefined,
        genreDisplayMode: event.cover.genreDisplayMode ?? undefined,
        lineupDisplayMode: event.lineup.displayMode ?? undefined,
        date: toDateOnlyOrSentinel(event.cover.date),
        timeStart: nullableString(event.cover.time?.start) ?? undefined,
        timeEnd: nullableString(event.cover.time?.end) ?? undefined,
        timetableStartTime: nullableString(event.timetable.startTime) ?? undefined,
        timetableEndTime: nullableString(event.timetable.endTime) ?? undefined,
        imageUrl: event.cover.imageUrl,
        imageAlt: event.cover.imageAlt,
        location: event.cover.location,
        venue: event.cover.venue,
        capacityTarget: event.cover.capacityTarget,
        eventType: event.cover.type,
        roomSize: event.cover.roomSize,
        numberOfRooms: event.cover.numberOfRooms || 0,
        totalBudget: new Prisma.Decimal(event.budget.totalBudget || 0),
        doorTicketRevenue: new Prisma.Decimal(event.budget.doorTicketRevenue || 0),
      },
      update: {
        slug: event.slug,
        status: event.status,
        admissionMode: event.admissionMode,
        updatedAt: new Date(),
        organizationId,
        recruiterProfileId: event.recruiterProfileId,
        title: event.cover.title,
        description: nullableString(event.cover.description) ?? undefined,
        shortDescription: nullableString(event.cover.shortDescription) ?? undefined,
        genreDisplayMode: event.cover.genreDisplayMode ?? undefined,
        lineupDisplayMode: event.lineup.displayMode ?? undefined,
        date: toDateOnlyOrSentinel(event.cover.date),
        timeStart: nullableString(event.cover.time?.start) ?? undefined,
        timeEnd: nullableString(event.cover.time?.end) ?? undefined,
        timetableStartTime: nullableString(event.timetable.startTime) ?? undefined,
        timetableEndTime: nullableString(event.timetable.endTime) ?? undefined,
        imageUrl: event.cover.imageUrl,
        imageAlt: event.cover.imageAlt,
        location: event.cover.location,
        venue: event.cover.venue,
        capacityTarget: event.cover.capacityTarget,
        eventType: event.cover.type,
        roomSize: event.cover.roomSize,
        numberOfRooms: event.cover.numberOfRooms || 0,
        totalBudget: new Prisma.Decimal(event.budget.totalBudget || 0),
        doorTicketRevenue: new Prisma.Decimal(event.budget.doorTicketRevenue || 0),
      },
    });

    await tx.eventLabelLink.deleteMany({ where: { eventId: event.id } });
    await tx.budgetItem.deleteMany({ where: { eventId: event.id } });
    await tx.guestlistEntry.deleteMany({ where: { eventId: event.id } });
    await tx.eventApplication.deleteMany({ where: { eventId: event.id } });
    await tx.eventAccessAssignment.deleteMany({ where: { eventId: event.id } });
    await tx.timetableRow.deleteMany({ where: { eventId: event.id } });
    await tx.lineupEntry.deleteMany({ where: { eventId: event.id } });
    await tx.eventRoom.deleteMany({ where: { eventId: event.id } });
    await tx.eventGenre.deleteMany({ where: { eventId: event.id } });
    await tx.ticketTier.deleteMany({
      where: {
        ticketSection: {
          eventId: event.id,
        },
      },
    });
    await tx.ticketSectionAllowedGroup.deleteMany({
      where: {
        ticketSection: {
          eventId: event.id,
        },
      },
    });
    await tx.ticketSection.deleteMany({ where: { eventId: event.id } });

    await ensureAccessGroups(tx, event);

    if (event.cover.genres.length > 0) {
      await tx.eventGenre.createMany({
        data: event.cover.genres.map((genre, index) => ({
          eventId: event.id,
          value: genre,
          sortOrder: index,
        })),
      });
    }

    for (const [index, room] of (event.cover.rooms ?? []).entries()) {
      const dbRoomId = roomReferenceToId.get(room.id) ?? toEventScopedId(event.id, room.id);

      await tx.eventRoom.create({
        data: {
          id: dbRoomId,
          eventId: event.id,
          clientKey: room.id,
          name: room.name,
          capacity: room.capacity,
          sortOrder: index,
          genres: room.genres?.length
            ? {
                createMany: {
                  data: room.genres.map((genre, genreIndex) => ({
                    value: genre,
                    sortOrder: genreIndex,
                  })),
                },
              }
            : undefined,
        },
      });
    }

    for (const [index, entry] of event.lineup.entries.entries()) {
      const dbLineupEntryId = lineupEntryReferenceToId.get(entry.id) ?? toEventScopedId(event.id, entry.id);
      const resolvedRoomIds = (entry.roomIds ?? (entry.roomId ? [entry.roomId] : []))
        .map((roomRef) => roomReferenceToId.get(roomRef) ?? roomRef)
        .filter(Boolean);

      await tx.lineupEntry.create({
        data: {
          id: dbLineupEntryId,
          eventId: event.id,
          clientKey: entry.id,
          artistId: entry.artistId,
          name: entry.name,
          kind: entry.kind ?? undefined,
          sortOrder: index,
          roomLinks:
            resolvedRoomIds.length > 0
              ? {
                  createMany: {
                    data: resolvedRoomIds.map((roomId) => ({
                      eventRoomId: roomId,
                    })),
                  },
                }
              : undefined,
        },
      });
    }

    if (event.timetable.rows.length > 0) {
      await tx.timetableRow.createMany({
        data: event.timetable.rows.map((row, index) => {
          const resolvedRoomId = row.room ? roomReferenceToId.get(row.room) : undefined;

          return {
            id: row.id,
            eventId: event.id,
            clientKey: row.id,
            title: row.title,
            lineupEntryId: row.lineupEntryId
              ? lineupEntryReferenceToId.get(row.lineupEntryId) ?? row.lineupEntryId
              : undefined,
            eventRoomId: resolvedRoomId,
            roomName: resolvedRoomId ? undefined : row.room ?? undefined,
            notes: nullableString(row.notes) ?? undefined,
            startTime: row.startTime,
            endTime: row.endTime,
            sortOrder: row.sortOrder ?? index,
          };
        }),
      });
    }

    if (event.guestlist.entries.length > 0) {
      await tx.guestlistEntry.createMany({
        data: event.guestlist.entries.map((entry) => ({
          id: entry.id,
          eventId: event.id,
          source: entry.source,
          accessGroupId: accessGroupReferenceToId.get(entry.accessGroupId) ?? entry.accessGroupId,
          consumerUserId: "userId" in entry ? entry.userId : entry.userId ?? undefined,
          firstName: entry.source === "manual" ? entry.firstName : undefined,
          lastName: entry.source === "manual" ? entry.lastName : undefined,
          checkedIn: entry.checkedIn,
          createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
          notes: entry.source === "manual" ? nullableString(entry.notes) ?? undefined : undefined,
        })),
      });
    }

    if (event.accessAssignments.length > 0) {
      await tx.eventAccessAssignment.createMany({
        data: event.accessAssignments.map((assignment) => ({
          eventId: event.id,
          consumerUserId: assignment.userId,
          accessGroupId:
            accessGroupReferenceToId.get(assignment.accessGroupId) ?? assignment.accessGroupId,
          source: assignment.source,
          paymentState: assignment.paymentState,
          checkedIn: assignment.checkedIn,
          assignedAt: toDateOrNull(assignment.assignedAt) ?? undefined,
          assignedBy: nullableString(assignment.assignedBy) ?? undefined,
          notes: nullableString(assignment.notes) ?? undefined,
        })),
      });
    }

    if (event.applications.length > 0) {
      await tx.eventApplication.createMany({
        data: event.applications.map((application: EventApplication) => ({
          eventId: event.id,
          consumerUserId: application.userId,
          status: application.status,
          appliedAt: new Date(application.appliedAt),
          reviewedAt: toDateOrNull(application.reviewedAt) ?? undefined,
          reviewedBy: nullableString(application.reviewedBy) ?? undefined,
          accessGroupId: application.accessGroupId
            ? accessGroupReferenceToId.get(application.accessGroupId) ?? application.accessGroupId
            : undefined,
          notes: nullableString(application.notes) ?? undefined,
        })),
      });
    }

    if (event.budget.items.length > 0) {
      await tx.budgetItem.createMany({
        data: event.budget.items.map((item, index) => ({
          id: item.id,
          eventId: event.id,
          clientKey: item.id,
          category: item.category,
          title: item.title,
          amount: new Prisma.Decimal(item.amount),
          paid: item.paid,
          notes: nullableString(item.notes) ?? undefined,
          sortOrder: index,
        })),
      });
    }

    for (const [index, section] of (event.tickets.sections ?? []).entries()) {
      await tx.ticketSection.create({
        data: {
          id: section.id,
          eventId: event.id,
          clientKey: section.id,
          name: section.name,
          visibility: section.visibility,
          accessGroupId:
            accessGroupReferenceToId.get(section.accessGroupId) ?? section.accessGroupId,
          sortOrder: index,
        },
      });

      if (section.allowedGroupIds.length > 0) {
        await tx.ticketSectionAllowedGroup.createMany({
          data: section.allowedGroupIds.map((accessGroupId) => ({
            ticketSectionId: section.id,
            accessGroupId: accessGroupReferenceToId.get(accessGroupId) ?? accessGroupId,
          })),
        });
      }

      if (section.phases.length > 0) {
        await tx.ticketTier.createMany({
          data: section.phases.map((phase, phaseIndex) => ({
            id: phase.id,
            ticketSectionId: section.id,
            clientKey: phase.id,
            name: phase.name,
            price: new Prisma.Decimal(phase.price),
            quantityAvailable: phase.quantityAvailable,
            quantitySold: phase.quantitySold ?? 0,
            visibility: phase.visibility,
            status: phase.status,
            sortOrder: phase.sortOrder ?? phaseIndex,
            salesStart: toDateOrNull(phase.salesStart) ?? undefined,
            salesEnd: toDateOrNull(phase.salesEnd) ?? undefined,
            releaseMode: phase.releaseMode ?? undefined,
            releaseAfterTierId: phase.releaseAfterTierId ?? undefined,
          })),
        });
      }
    }

    for (const [index, label] of (event.labels ?? []).entries()) {
      await tx.eventLabel.upsert({
        where: { id: label.id },
        create: {
          id: label.id,
          name: label.name,
          profileSlug: nullableString(label.profileSlug) ?? undefined,
          avatarImageUrl: nullableString(label.avatarImageUrl) ?? undefined,
          recruiterProfileId:
            label.profileSlug === event.recruiterProfileId || label.id === event.recruiterProfileId
              ? event.recruiterProfileId
              : undefined,
        },
        update: {
          name: label.name,
          profileSlug: nullableString(label.profileSlug) ?? undefined,
          avatarImageUrl: nullableString(label.avatarImageUrl) ?? undefined,
        },
      });

      await tx.eventLabelLink.create({
        data: {
          eventId: event.id,
          eventLabelId: label.id,
          sortOrder: index,
        },
      });
    }
  });

  return getEventById(event.id);
}

export async function getConsumerUserById(id: string) {
  const user = await prisma.consumerUser.findUnique({
    where: { id },
    include: consumerUserInclude,
  });

  return user ? mapConsumerUserModel(user) : null;
}

export async function getRecruiterProfile() {
  const profile = await prisma.recruiterProfile.findFirst({
    include: recruiterProfileInclude,
  });

  if (!profile) {
    return null;
  }

  const events = await getAllEvents();
  return mapRecruiterProfileModel(profile, events.filter((event) => event.recruiterProfileId === profile.id));
}

export async function getRecruiterProfileSummary() {
  const profile = await prisma.recruiterProfile.findFirst({
    include: recruiterProfileInclude,
  });

  return profile ? mapRecruiterProfileModel(profile) : null;
}

export async function getRecruiterProfileById(id: string) {
  const profile = await prisma.recruiterProfile.findUnique({
    where: { id },
    include: recruiterProfileInclude,
  });

  if (!profile) {
    return null;
  }

  const events = await getAllEvents();
  return mapRecruiterProfileModel(profile, events.filter((event) => event.recruiterProfileId === profile.id));
}

export async function getRecruiterProfileByIdSummary(id: string) {
  const profile = await prisma.recruiterProfile.findUnique({
    where: { id },
    include: recruiterProfileInclude,
  });

  return profile ? mapRecruiterProfileModel(profile) : null;
}

export async function getRecruiterProfileByOrganizationId(organizationId: string) {
  const profile = await prisma.recruiterProfile.findFirst({
    where: { organizationId },
    include: recruiterProfileInclude,
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    return null;
  }

  const events = await getEventsByOrganizationId(organizationId);
  return mapRecruiterProfileModel(profile, events.filter((event) => event.organizationId === organizationId));
}

export async function getRecruiterProfileByOrganizationIdSummary(organizationId: string) {
  const profile = await prisma.recruiterProfile.findFirst({
    where: { organizationId },
    include: recruiterProfileInclude,
    orderBy: { createdAt: "asc" },
  });

  return profile ? mapRecruiterProfileModel(profile) : null;
}

export async function getAllConsumers() {
  const users = await prisma.consumerUser.findMany({
    include: consumerUserInclude,
    orderBy: { createdAt: "asc" },
  });

  return users.map(mapConsumerUserModel);
}

export async function getConsumersByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const users = await prisma.consumerUser.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    include: consumerUserInclude,
    orderBy: { createdAt: "asc" },
  });

  return users.map(mapConsumerUserModel);
}

export async function getAllEvents() {
  const events = await prisma.event.findMany({
    include: eventInclude,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  return events.map(mapEventModel);
}

export async function getPublicEvents() {
  const events = await prisma.event.findMany({
    where: getPublicEventWhereInput(),
    include: eventInclude,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  return events.map(mapEventModel);
}

export async function getEventsByOrganizationId(organizationId: string) {
  const events = await prisma.event.findMany({
    where: { organizationId },
    include: eventInclude,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  return events.map(mapEventModel);
}

export async function getEventById(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: eventInclude,
  });

  return event ? mapEventModel(event) : null;
}

export async function getEventBySlug(slug: string) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: eventInclude,
  });

  return event ? mapEventModel(event) : null;
}

export async function deleteEventAggregate(id: string) {
  await prisma.event.delete({
    where: { id },
  });
}

export async function getStoreUserById(id: string) {
  return getConsumerUserById(id);
}

export async function getBootstrapState() {
  const [profile, users, events] = await Promise.all([
    getRecruiterProfile(),
    getAllConsumers(),
    getAllEvents(),
  ]);

  if (!profile) {
    return null;
  }

  return {
    profile,
    users,
    events,
    artists: deriveArtists(events),
  };
}
