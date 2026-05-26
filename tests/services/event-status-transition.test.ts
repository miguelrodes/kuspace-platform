import { beforeEach, describe, expect, it, vi } from "vitest";
import { forbidden } from "@/lib/http/errors";
import { buildDraftEvent } from "@/tests/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireOwnedRecruiterEventService: vi.fn(),
  requireCurrentRecruiterProfileService: vi.fn(),
  saveEventRepositoryAggregate: vi.fn(),
  deleteEventRepositoryAggregate: vi.fn(),
}));

vi.mock("@/lib/services/access-service", () => ({
  requireOwnedRecruiterEventService: mocks.requireOwnedRecruiterEventService,
  requireCurrentRecruiterProfileService: mocks.requireCurrentRecruiterProfileService,
}));

vi.mock("@/lib/db/repositories/event-repository", () => ({
  saveEventRepositoryAggregate: mocks.saveEventRepositoryAggregate,
  deleteEventRepositoryAggregate: mocks.deleteEventRepositoryAggregate,
}));

import { transitionEventStatusService } from "@/lib/services/event-service";

describe("event status transition service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows valid backend-controlled transitions", async () => {
    const draftEvent = buildDraftEvent({ status: "draft" });
    const upcomingEvent = { ...draftEvent, status: "upcoming" as const };

    mocks.requireOwnedRecruiterEventService.mockResolvedValue({
      actor: {
        currentRecruiterProfileId: draftEvent.recruiterProfileId,
        currentOrganizationId: draftEvent.organizationId,
      },
      event: draftEvent,
    });
    mocks.saveEventRepositoryAggregate.mockResolvedValue(upcomingEvent);

    await expect(transitionEventStatusService(draftEvent.id, "upcoming")).resolves.toEqual(upcomingEvent);
    expect(mocks.saveEventRepositoryAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: draftEvent.id,
        status: "upcoming",
      }),
    );
  });

  it("rejects invalid transitions", async () => {
    const draftEvent = buildDraftEvent({ status: "draft" });

    mocks.requireOwnedRecruiterEventService.mockResolvedValue({
      actor: {
        currentRecruiterProfileId: draftEvent.recruiterProfileId,
        currentOrganizationId: draftEvent.organizationId,
      },
      event: draftEvent,
    });

    await expect(transitionEventStatusService(draftEvent.id, "past")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    expect(mocks.saveEventRepositoryAggregate).not.toHaveBeenCalled();
  });
});
