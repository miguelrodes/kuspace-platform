import type { Event } from "@/types/event";
import { getCurrentAppActorService } from "@/lib/services/auth-actor-service";
import { getConsumerRepositoryById, getConsumersRepositoryByIds } from "@/lib/db/repositories/consumer-repository";
import {
  getRecruiterRepositorySummary,
  getRecruiterRepositoryByIdSummary,
  getRecruiterRepositoryByOrganizationIdSummary,
} from "@/lib/db/repositories/recruiter-repository";
import {
  getEventsRepositoryByOrganizationId,
  getPublicEventsRepository,
} from "@/lib/db/repositories/event-repository";
import { getOrganizationRepositoryById } from "@/lib/db/repositories/organization-repository";
import type { RecruiterProfile } from "@/types/profile";
import { listMyOrganizationsService } from "@/lib/services/workspace-service";

function deriveArtists(events: Event[]) {
  return Array.from(
    new Map(
      events
        .flatMap((event) => event.lineup.entries)
        .map((entry) => [entry.artistId, { id: entry.artistId, name: entry.name }]),
    ).values(),
  ).sort((left, right) => left.name.localeCompare(right.name));
}

const EMPTY_RECRUITER_PROFILE: RecruiterProfile = {
  id: "",
  slug: "",
  recruiterType: "nightclub",
  displayName: "",
};

function attachProfileEvents(profile: RecruiterProfile, events: Event[]) {
  const profileEvents = events.filter((event) => {
    if (profile.organizationId) {
      return event.organizationId === profile.organizationId;
    }

    return event.recruiterProfileId === profile.id;
  });

  return {
    ...profile,
    events: {
      upcoming: profileEvents.filter((event) => event.status === "live" || event.status === "upcoming"),
      past: profileEvents.filter((event) => event.status === "past"),
    },
  } satisfies RecruiterProfile;
}

function getRelatedConsumerIds(events: Event[]) {
  const consumerIds = new Set<string>();

  for (const event of events) {
    for (const assignment of event.accessAssignments) {
      consumerIds.add(assignment.userId);
    }

    for (const application of event.applications) {
      consumerIds.add(application.userId);
    }

    for (const entry of event.guestlist.entries) {
      if (entry.source === "user") {
        consumerIds.add(entry.userId);
        continue;
      }

      if (entry.userId) {
        consumerIds.add(entry.userId);
      }
    }
  }

  return Array.from(consumerIds);
}

export async function getStoreBootstrapService() {
  const actor = await getCurrentAppActorService();

  if (actor.role === "recruiter" && actor.currentRecruiterProfileId) {
    const [organization, profile, events, organizations] = await Promise.all([
      actor.currentOrganizationId
        ? getOrganizationRepositoryById(actor.currentOrganizationId)
        : Promise.resolve(null),
      actor.currentOrganizationId
        ? getRecruiterRepositoryByOrganizationIdSummary(actor.currentOrganizationId)
        : getRecruiterRepositoryByIdSummary(actor.currentRecruiterProfileId),
      actor.currentOrganizationId
        ? getEventsRepositoryByOrganizationId(actor.currentOrganizationId)
        : Promise.resolve([]),
      listMyOrganizationsService(),
    ]);

    const relatedConsumerIds = getRelatedConsumerIds(events);
    const visibleUsers = relatedConsumerIds.length
      ? await getConsumersRepositoryByIds(relatedConsumerIds)
      : [];
    const hydratedProfile = profile ? attachProfileEvents(profile, events) : EMPTY_RECRUITER_PROFILE;

    return {
      profile: hydratedProfile,
      users: visibleUsers,
      events,
      artists: deriveArtists(events),
      currentRole: actor.role,
      currentConsumerUserId: actor.currentConsumerUserId,
      currentRecruiterProfileId: actor.currentRecruiterProfileId,
      currentOrganizationId: actor.currentOrganizationId,
      currentOrganizationRole: actor.currentOrganizationRole,
      currentOrganization: organization,
      organizations,
      needsActorSelection: actor.needsActorSelection,
      needsOrganizationSetup: actor.needsOrganizationSetup,
    };
  }

  if (actor.role === "recruiter" && actor.needsOrganizationSetup) {
    const organizations = await listMyOrganizationsService();

    return {
      profile: EMPTY_RECRUITER_PROFILE,
      users: [],
      events: [],
      artists: [],
      currentRole: actor.role,
      currentConsumerUserId: actor.currentConsumerUserId,
      currentRecruiterProfileId: actor.currentRecruiterProfileId,
      currentOrganizationId: actor.currentOrganizationId,
      currentOrganizationRole: actor.currentOrganizationRole,
      currentOrganization: null,
      organizations,
      needsActorSelection: actor.needsActorSelection,
      needsOrganizationSetup: true,
    };
  }

  const [profile, allEvents, user] = await Promise.all([
    getRecruiterRepositorySummary(),
    getPublicEventsRepository(),
    actor.role === "consumer" && actor.currentConsumerUserId
      ? getConsumerRepositoryById(actor.currentConsumerUserId)
      : Promise.resolve(null),
  ]);

  if (!profile) {
    return null;
  }

  const visibleEvents = allEvents;
  const users = user ? [user] : [];

  return {
    profile: attachProfileEvents(profile, visibleEvents),
    users,
    events: visibleEvents,
    artists: deriveArtists(visibleEvents),
    currentRole: actor.role,
    currentConsumerUserId: actor.currentConsumerUserId,
    currentRecruiterProfileId: actor.currentRecruiterProfileId,
    currentOrganizationId: actor.currentOrganizationId,
    currentOrganizationRole: actor.currentOrganizationRole,
    currentOrganization: null,
    needsActorSelection: actor.needsActorSelection,
    needsOrganizationSetup: actor.needsOrganizationSetup,
  };
}
