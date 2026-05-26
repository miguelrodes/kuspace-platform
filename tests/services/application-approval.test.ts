import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildLiveCuratedEvent } from "@/tests/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireOwnedRecruiterEventService: vi.fn(),
  requireOwnedConsumerUserService: vi.fn(),
  getEventAccessRepositoryByEventId: vi.fn(),
  saveEventAccessRepository: vi.fn(),
}));

vi.mock("@/lib/services/access-service", () => ({
  requireOwnedRecruiterEventService: mocks.requireOwnedRecruiterEventService,
  requireOwnedConsumerUserService: mocks.requireOwnedConsumerUserService,
}));

vi.mock("@/lib/db/repositories/access-repository", () => ({
  getEventAccessRepositoryByEventId: mocks.getEventAccessRepositoryByEventId,
  saveEventAccessRepository: mocks.saveEventAccessRepository,
}));

import { approveCuratedApplicationService } from "@/lib/services/application-service";

describe("curated application approval service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves an application and creates an access assignment", async () => {
    const event = buildLiveCuratedEvent({
      applications: [
        {
          eventId: "event-curated-2026-08-02",
          userId: "consumer-luca-dea",
          status: "pending",
          appliedAt: "2026-04-01T00:00:00.000Z",
        },
      ],
    });

    mocks.requireOwnedRecruiterEventService.mockResolvedValue({
      actor: {
        currentRecruiterProfileId: "recruiter-neon-harbor",
        currentOrganizationId: event.organizationId,
      },
      event,
    });
    mocks.saveEventAccessRepository.mockImplementation(async (nextEvent) => nextEvent);

    const savedEvent = await approveCuratedApplicationService({
      eventId: event.id,
      userId: "consumer-luca-dea",
      accessGroupId: "group-guestlist",
    });

    expect(savedEvent.applications[0]).toMatchObject({
      userId: "consumer-luca-dea",
      status: "accepted",
      accessGroupId: "group-guestlist",
    });
    expect(savedEvent.accessAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: "consumer-luca-dea",
          accessGroupId: "group-guestlist",
          source: "approval",
        }),
      ]),
    );
  });
});
