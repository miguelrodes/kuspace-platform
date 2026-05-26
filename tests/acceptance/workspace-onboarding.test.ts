import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildConsumerUser, buildRecruiterProfile } from "@/tests/helpers/fixtures";
import type { ConsumerUser } from "@/types/user";
import type { RecruiterProfile } from "@/types/profile";
import type { Event } from "@/types/event";
import type {
  OrganizationMembershipRole,
  WorkspaceOrganization,
} from "@/types/workspace";

type Membership = {
  id: string;
  organizationId: string;
  clerkUserId: string;
  role: OrganizationMembershipRole;
};

type InternalConsumerUser = ConsumerUser & {
  clerkUserId?: string;
};

const state = vi.hoisted(() => ({
  sessionUserId: "clerk-recruiter-1",
  preferredOrganizationId: null as string | null,
  organizations: [] as WorkspaceOrganization[],
  memberships: [] as Membership[],
  recruiterProfiles: [] as RecruiterProfile[],
  consumers: [] as InternalConsumerUser[],
  events: new Map<string, Event>(),
}));

const repoMocks = vi.hoisted(() => ({
  createOrLinkConsumerForClerkRepository: vi.fn(),
  getActorBindingRepository: vi.fn(),
  getOrganizationRepositoryBySlug: vi.fn(),
  createOrganizationRepository: vi.fn(),
  createOrganizationMembershipRepository: vi.fn(),
  updateOrganizationRepository: vi.fn(),
  getOrganizationRepositoryById: vi.fn(),
  getOrganizationsForClerkUserRepository: vi.fn(),
  getOrganizationMembershipRepository: vi.fn(),
  saveRecruiterRepository: vi.fn(),
  getRecruiterRepositoryById: vi.fn(),
  getRecruiterRepositorySummary: vi.fn(),
  getRecruiterRepositoryByIdSummary: vi.fn(),
  getRecruiterRepositoryByOrganizationIdSummary: vi.fn(),
  getRecruiterRepositoryByOrganizationId: vi.fn(),
  getAllConsumersRepository: vi.fn(),
  getConsumerRepositoryById: vi.fn(),
  getAllEventsRepository: vi.fn(),
  getEventsRepositoryByOrganizationId: vi.fn(),
  saveEventRepositoryAggregate: vi.fn(),
  getEventRepositoryById: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "kuspace_current_organization_id" && state.preferredOrganizationId
        ? { value: state.preferredOrganizationId }
        : undefined,
  })),
}));

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(async () => ({
    primaryEmailAddress: { emailAddress: `${state.sessionUserId}@example.com` },
    emailAddresses: [{ emailAddress: `${state.sessionUserId}@example.com` }],
    firstName: state.sessionUserId.includes("consumer") ? "Luca" : "Owner",
    lastName: "User",
    imageUrl: "https://example.com/avatar.png",
  })),
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthSession: vi.fn(async () => ({
    isAuthenticated: Boolean(state.sessionUserId),
    userId: state.sessionUserId,
  })),
  requireAuthenticatedSession: vi.fn(async () => ({
    userId: state.sessionUserId,
  })),
}));

vi.mock("@/lib/repositories/auth-actor-repository", () => ({
  createOrLinkConsumerForClerkRepository: (...args: unknown[]) =>
    repoMocks.createOrLinkConsumerForClerkRepository(...args),
  getActorBindingRepository: (...args: unknown[]) => repoMocks.getActorBindingRepository(...args),
}));

vi.mock("@/lib/db/repositories/organization-repository", () => ({
  getOrganizationRepositoryBySlug: (...args: unknown[]) =>
    repoMocks.getOrganizationRepositoryBySlug(...args),
  createOrganizationRepository: (...args: unknown[]) =>
    repoMocks.createOrganizationRepository(...args),
  createOrganizationMembershipRepository: (...args: unknown[]) =>
    repoMocks.createOrganizationMembershipRepository(...args),
  updateOrganizationRepository: (...args: unknown[]) =>
    repoMocks.updateOrganizationRepository(...args),
  getOrganizationRepositoryById: (...args: unknown[]) =>
    repoMocks.getOrganizationRepositoryById(...args),
  getOrganizationsForClerkUserRepository: (...args: unknown[]) =>
    repoMocks.getOrganizationsForClerkUserRepository(...args),
  getOrganizationMembershipRepository: (...args: unknown[]) =>
    repoMocks.getOrganizationMembershipRepository(...args),
}));

vi.mock("@/lib/db/repositories/recruiter-repository", () => ({
  saveRecruiterRepository: (...args: unknown[]) => repoMocks.saveRecruiterRepository(...args),
  getRecruiterRepositorySummary: (...args: unknown[]) =>
    repoMocks.getRecruiterRepositorySummary(...args),
  getRecruiterRepositoryByIdSummary: (...args: unknown[]) =>
    repoMocks.getRecruiterRepositoryByIdSummary(...args),
  getRecruiterRepositoryByOrganizationIdSummary: (...args: unknown[]) =>
    repoMocks.getRecruiterRepositoryByOrganizationIdSummary(...args),
  getRecruiterRepositoryById: (...args: unknown[]) => repoMocks.getRecruiterRepositoryById(...args),
  getRecruiterRepositoryByOrganizationId: (...args: unknown[]) =>
    repoMocks.getRecruiterRepositoryByOrganizationId(...args),
}));

vi.mock("@/lib/db/repositories/consumer-repository", () => ({
  getAllConsumersRepository: (...args: unknown[]) => repoMocks.getAllConsumersRepository(...args),
  getConsumerRepositoryById: (...args: unknown[]) => repoMocks.getConsumerRepositoryById(...args),
}));

vi.mock("@/lib/db/repositories/event-repository", () => ({
  getAllEventsRepository: (...args: unknown[]) => repoMocks.getAllEventsRepository(...args),
  getEventsRepositoryByOrganizationId: (...args: unknown[]) =>
    repoMocks.getEventsRepositoryByOrganizationId(...args),
  saveEventRepositoryAggregate: (...args: unknown[]) =>
    repoMocks.saveEventRepositoryAggregate(...args),
  getEventRepositoryById: (...args: unknown[]) => repoMocks.getEventRepositoryById(...args),
  deleteEventRepositoryAggregate: vi.fn(),
}));

import { getStoreBootstrapService } from "@/lib/services/bootstrap-service";
import { createOrganizationService } from "@/lib/services/organization-service";
import { createEventService, transitionEventStatusService } from "@/lib/services/event-service";
import { getCurrentAppActorService, selectCurrentAppActorService } from "@/lib/services/auth-actor-service";

function buildConsumerRecord(overrides: Partial<InternalConsumerUser> = {}): InternalConsumerUser {
  const { clerkUserId, ...consumerOverrides } = overrides;
  return {
    ...buildConsumerUser(consumerOverrides),
    ...(clerkUserId ? { clerkUserId } : {}),
  };
}

function buildMembershipView(clerkUserId: string) {
  return state.memberships
    .filter((membership) => membership.clerkUserId === clerkUserId)
    .map((membership) => ({
      organization: state.organizations.find((organization) => organization.id === membership.organizationId)!,
      role: membership.role,
    }));
}

function getRecruiterBinding(clerkUserId: string, preferredOrganizationId?: string | null) {
  const recruiterProfiles = state.recruiterProfiles.filter((profile) => profile.clerkUserId === clerkUserId);
  const memberships = buildMembershipView(clerkUserId);
  const preferredMembership = preferredOrganizationId
    ? memberships.find(({ organization }) => organization.id === preferredOrganizationId) ?? null
    : null;
  const fallbackMembership = preferredMembership ?? memberships[0] ?? null;
  const profile = fallbackMembership
    ? recruiterProfiles.find((candidate) => candidate.organizationId === fallbackMembership.organization.id) ?? null
    : recruiterProfiles[0] ?? null;

  return {
    consumerUserId: null,
    recruiterProfileId: profile?.id ?? null,
    currentOrganizationId: fallbackMembership?.organization.id ?? profile?.organizationId ?? null,
    currentOrganizationRole: fallbackMembership?.role ?? null,
  };
}

describe("workspace onboarding acceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.sessionUserId = "clerk-recruiter-1";
    state.preferredOrganizationId = null;
    state.organizations = [];
    state.memberships = [];
    state.recruiterProfiles = [];
    state.consumers = [buildConsumerRecord()];
    state.events = new Map();

    repoMocks.createOrLinkConsumerForClerkRepository.mockImplementation(async ({ clerkUserId, emailAddress }: { clerkUserId: string; emailAddress: string }) => {
      let consumer = state.consumers.find((candidate) => candidate.clerkUserId === clerkUserId);
      if (!consumer) {
        consumer = {
          ...buildConsumerRecord({
            id: `consumer-${clerkUserId}`,
            email: emailAddress,
            username: clerkUserId.replace(/^clerk-/, "").replace(/[^a-z0-9]+/gi, "").toLowerCase(),
            clerkUserId,
          }),
        };
        state.consumers.push(consumer);
      }
      return consumer;
    });

    repoMocks.getActorBindingRepository.mockImplementation(async (clerkUserId: string, preferredOrganizationId?: string | null) => {
      const consumer = state.consumers.find((candidate) => candidate.clerkUserId === clerkUserId);
      if (consumer) {
        return {
          consumerUserId: consumer.id,
          recruiterProfileId: null,
          currentOrganizationId: null,
          currentOrganizationRole: null,
        };
      }

      return getRecruiterBinding(clerkUserId, preferredOrganizationId);
    });

    repoMocks.getOrganizationRepositoryBySlug.mockImplementation(async (slug: string) =>
      state.organizations.find((organization) => organization.slug === slug) ?? null,
    );
    repoMocks.createOrganizationRepository.mockImplementation(async ({ name, slug, type }: { name: string; slug: string; type: WorkspaceOrganization["type"] }) => {
      const organization = { id: `organization-${slug}`, name, slug, type };
      state.organizations.push(organization);
      return organization;
    });
    repoMocks.createOrganizationMembershipRepository.mockImplementation(async ({ organizationId, clerkUserId, role }: Membership) => {
      const membership = {
        id: `membership-${organizationId}-${clerkUserId}`,
        organizationId,
        clerkUserId,
        role,
      };
      state.memberships.push(membership);
      return membership;
    });
    repoMocks.updateOrganizationRepository.mockImplementation(async (organizationId: string, input: Partial<WorkspaceOrganization>) => {
      const organization = state.organizations.find((candidate) => candidate.id === organizationId)!;
      Object.assign(organization, input);
      return organization;
    });
    repoMocks.getOrganizationRepositoryById.mockImplementation(async (organizationId: string) =>
      state.organizations.find((organization) => organization.id === organizationId) ?? null,
    );
    repoMocks.getOrganizationsForClerkUserRepository.mockImplementation(async (clerkUserId: string) =>
      buildMembershipView(clerkUserId),
    );
    repoMocks.getOrganizationMembershipRepository.mockImplementation(async ({ organizationId, clerkUserId }: { organizationId: string; clerkUserId: string }) => {
      const membership = state.memberships.find(
        (candidate) =>
          candidate.organizationId === organizationId && candidate.clerkUserId === clerkUserId,
      );
      if (!membership) {
        return null;
      }

      return {
        role: membership.role,
        organization: state.organizations.find((organization) => organization.id === organizationId)!,
      };
    });
    repoMocks.saveRecruiterRepository.mockImplementation(async (profile: RecruiterProfile) => {
      const existingIndex = state.recruiterProfiles.findIndex((candidate) => candidate.id === profile.id);
      if (existingIndex >= 0) {
        state.recruiterProfiles[existingIndex] = profile;
      } else {
        state.recruiterProfiles.push(profile);
      }
      return profile;
    });
    repoMocks.getRecruiterRepositoryById.mockImplementation(async (id: string) =>
      state.recruiterProfiles.find((profile) => profile.id === id) ?? null,
    );
    repoMocks.getRecruiterRepositorySummary.mockImplementation(async () => state.recruiterProfiles[0] ?? null);
    repoMocks.getRecruiterRepositoryByIdSummary.mockImplementation(async (id: string) =>
      state.recruiterProfiles.find((profile) => profile.id === id) ?? null,
    );
    repoMocks.getRecruiterRepositoryByOrganizationIdSummary.mockImplementation(async (organizationId: string) =>
      state.recruiterProfiles.find((profile) => profile.organizationId === organizationId) ?? null,
    );
    repoMocks.getRecruiterRepositoryByOrganizationId.mockImplementation(async (organizationId: string) =>
      state.recruiterProfiles.find((profile) => profile.organizationId === organizationId) ?? null,
    );
    repoMocks.getAllConsumersRepository.mockImplementation(async () => state.consumers);
    repoMocks.getConsumerRepositoryById.mockImplementation(async (id: string) =>
      state.consumers.find((consumer) => consumer.id === id) ?? null,
    );
    repoMocks.getAllEventsRepository.mockImplementation(async () => Array.from(state.events.values()));
    repoMocks.getEventsRepositoryByOrganizationId.mockImplementation(async (organizationId: string) =>
      Array.from(state.events.values()).filter((event) => event.organizationId === organizationId),
    );
    repoMocks.saveEventRepositoryAggregate.mockImplementation(async (event: Event) => {
      state.events.set(event.id, event);
      return event;
    });
    repoMocks.getEventRepositoryById.mockImplementation(async (eventId: string) =>
      state.events.get(eventId) ?? null,
    );
  });

  it("routes a new recruiter through organization creation into an org-scoped office", async () => {
    const selectedRecruiter = await selectCurrentAppActorService("recruiter");
    expect(selectedRecruiter.destination).toBe("/create-organization");

    const created = await createOrganizationService({
      name: "Midnight Society",
      slug: "midnight-society",
      type: "independent_organizer",
      locationDisplayText: "Barcelona",
    });

    expect(created.organization.slug).toBe("midnight-society");
    expect(state.memberships).toEqual([
      expect.objectContaining({
        organizationId: created.organization.id,
        clerkUserId: "clerk-recruiter-1",
        role: "owner",
      }),
    ]);

    state.preferredOrganizationId = created.organization.id;

    const actor = await getCurrentAppActorService();
    expect(actor.role).toBe("recruiter");
    expect(actor.currentOrganizationId).toBe(created.organization.id);

    const event = await createEventService({ slug: "midnight-society-opening-2026-09-12" });
    expect(event.organizationId).toBe(created.organization.id);

    const bootstrap = await getStoreBootstrapService();
    expect(bootstrap?.currentOrganization?.slug).toBe("midnight-society");
    expect(bootstrap?.events.map((candidate) => candidate.slug)).toEqual([
      "midnight-society-opening-2026-09-12",
    ]);
  });

  it("prevents a second recruiter from mutating another workspace's event while leaving consumer login untouched", async () => {
    state.organizations.push({
      id: "organization-owner-one",
      slug: "owner-one",
      name: "Owner One",
      type: "nightclub",
    });
    state.memberships.push({
      id: "membership-owner-one",
      organizationId: "organization-owner-one",
      clerkUserId: "clerk-recruiter-1",
      role: "owner",
    });
    state.recruiterProfiles.push(
      buildRecruiterProfile({
        id: "recruiter-owner-one",
        organizationId: "organization-owner-one",
        clerkUserId: "clerk-recruiter-1",
        slug: "owner-one",
        displayName: "Owner One",
      }),
    );
    state.preferredOrganizationId = "organization-owner-one";

    const event = await createEventService({ slug: "owner-one-opening-2026-10-01" });

    state.organizations.push({
      id: "organization-owner-two",
      slug: "owner-two",
      name: "Owner Two",
      type: "label",
    });
    state.memberships.push({
      id: "membership-owner-two",
      organizationId: "organization-owner-two",
      clerkUserId: "clerk-recruiter-2",
      role: "owner",
    });
    state.recruiterProfiles.push(
      buildRecruiterProfile({
        id: "recruiter-owner-two",
        organizationId: "organization-owner-two",
        clerkUserId: "clerk-recruiter-2",
        slug: "owner-two",
        displayName: "Owner Two",
        recruiterType: "label",
      }),
    );

    state.sessionUserId = "clerk-recruiter-2";
    state.preferredOrganizationId = "organization-owner-two";

    await expect(transitionEventStatusService(event.id, "upcoming")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });

    state.sessionUserId = "clerk-consumer-1";
    state.preferredOrganizationId = null;

    const consumerSelection = await selectCurrentAppActorService("consumer");
    expect(consumerSelection.destination).toBe("/conshome");

    const consumerActor = await getCurrentAppActorService();
    expect(consumerActor.role).toBe("consumer");
    expect(consumerActor.currentOrganizationId).toBeNull();
  });
});
