import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildConsumerUser, buildLivePublicEvent, buildRecruiterProfile } from "@/tests/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  getCurrentAppActorService: vi.fn(),
  getAllConsumersRepository: vi.fn(),
  getConsumerRepositoryById: vi.fn(),
  getRecruiterRepositorySummary: vi.fn(),
  getRecruiterRepositoryByIdSummary: vi.fn(),
  getRecruiterRepositoryByOrganizationIdSummary: vi.fn(),
  getAllRecruiterProfilesRepository: vi.fn(),
  getAllEventsRepository: vi.fn(),
  getEventsRepositoryByOrganizationId: vi.fn(),
  getPublicEventsRepository: vi.fn(),
  getOrganizationRepositoryById: vi.fn(),
  listMyOrganizationsService: vi.fn(),
}));

vi.mock("@/lib/services/auth-actor-service", () => ({
  getCurrentAppActorService: mocks.getCurrentAppActorService,
}));

vi.mock("@/lib/db/repositories/consumer-repository", () => ({
  getAllConsumersRepository: mocks.getAllConsumersRepository,
  getConsumerRepositoryById: mocks.getConsumerRepositoryById,
}));

vi.mock("@/lib/db/repositories/recruiter-repository", () => ({
  getAllRecruiterProfilesRepository: mocks.getAllRecruiterProfilesRepository,
  getRecruiterRepositorySummary: mocks.getRecruiterRepositorySummary,
  getRecruiterRepositoryByIdSummary: mocks.getRecruiterRepositoryByIdSummary,
  getRecruiterRepositoryByOrganizationIdSummary: mocks.getRecruiterRepositoryByOrganizationIdSummary,
}));

vi.mock("@/lib/db/repositories/event-repository", () => ({
  getAllEventsRepository: mocks.getAllEventsRepository,
  getEventsRepositoryByOrganizationId: mocks.getEventsRepositoryByOrganizationId,
  getPublicEventsRepository: mocks.getPublicEventsRepository,
}));

vi.mock("@/lib/db/repositories/organization-repository", () => ({
  getOrganizationRepositoryById: mocks.getOrganizationRepositoryById,
}));

vi.mock("@/lib/services/workspace-service", () => ({
  listMyOrganizationsService: mocks.listMyOrganizationsService,
}));

import { getStoreBootstrapService } from "@/lib/services/bootstrap-service";

describe("workspace-aware bootstrap service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads recruiter bootstrap data from the current organization workspace", async () => {
    const recruiterProfile = buildRecruiterProfile({
      id: "recruiter-aurora-quay",
      organizationId: "organization-aurora-quay",
      slug: "aurora-quay",
      displayName: "Aurora Quay",
    });
    const recruiterEvent = buildLivePublicEvent({
      id: "event-aurora-quay-opening",
      organizationId: "organization-aurora-quay",
      recruiterProfileId: recruiterProfile.id,
      slug: "aurora-quay-opening",
    });
    const unrelatedEvent = buildLivePublicEvent({
      id: "event-other",
      organizationId: "organization-other",
      recruiterProfileId: "recruiter-other",
      slug: "other-opening",
    });

    mocks.getCurrentAppActorService.mockResolvedValue({
      role: "recruiter",
      currentConsumerUserId: null,
      currentRecruiterProfileId: recruiterProfile.id,
      currentOrganizationId: "organization-aurora-quay",
      currentOrganizationRole: "owner",
      needsActorSelection: false,
      needsOrganizationSetup: false,
    });
    mocks.getOrganizationRepositoryById.mockResolvedValue({
      id: "organization-aurora-quay",
      slug: "aurora-quay",
      name: "Aurora Quay",
      type: "nightclub",
    });
    mocks.getRecruiterRepositoryByOrganizationIdSummary.mockResolvedValue(recruiterProfile);
    mocks.getEventsRepositoryByOrganizationId.mockResolvedValue([recruiterEvent]);
    mocks.getAllRecruiterProfilesRepository.mockResolvedValue([recruiterProfile]);
    mocks.getPublicEventsRepository.mockResolvedValue([recruiterEvent, unrelatedEvent]);
    mocks.getAllConsumersRepository.mockResolvedValue([buildConsumerUser()]);
    mocks.listMyOrganizationsService.mockResolvedValue([
      {
        organization: {
          id: "organization-aurora-quay",
          slug: "aurora-quay",
          name: "Aurora Quay",
          type: "nightclub",
        },
        role: "owner",
      },
    ]);

    const result = await getStoreBootstrapService();

    expect(result?.profile.slug).toBe("aurora-quay");
    expect(result?.events.map((event) => event.id)).toEqual(["event-aurora-quay-opening"]);
    expect(result?.discoveryEvents.map((event) => event.id)).toEqual([
      "event-aurora-quay-opening",
      "event-other",
    ]);
    expect(result?.recruiters.map((candidate) => candidate.id)).toEqual([recruiterProfile.id]);
    expect(result?.currentOrganization?.id).toBe("organization-aurora-quay");
    expect(result?.organizations).toEqual([
      {
        organization: {
          id: "organization-aurora-quay",
          slug: "aurora-quay",
          name: "Aurora Quay",
          type: "nightclub",
        },
        role: "owner",
      },
    ]);
  });

  it("returns empty recruiter workspace state when organization setup is still required", async () => {
    mocks.getCurrentAppActorService.mockResolvedValue({
      role: "recruiter",
      currentConsumerUserId: null,
      currentRecruiterProfileId: null,
      currentOrganizationId: null,
      currentOrganizationRole: null,
      needsActorSelection: false,
      needsOrganizationSetup: true,
    });
    mocks.listMyOrganizationsService.mockResolvedValue([]);
    mocks.getAllRecruiterProfilesRepository.mockResolvedValue([]);
    mocks.getPublicEventsRepository.mockResolvedValue([]);

    const result = await getStoreBootstrapService();

    expect(result?.needsOrganizationSetup).toBe(true);
    expect(result?.events).toEqual([]);
    expect(result?.currentOrganization).toBeNull();
  });
});
