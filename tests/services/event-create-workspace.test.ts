import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentRecruiterProfileService: vi.fn(),
  requireOwnedRecruiterEventService: vi.fn(),
  saveEventRepositoryAggregate: vi.fn(),
}));

vi.mock("@/lib/services/access-service", () => ({
  requireCurrentRecruiterProfileService: mocks.requireCurrentRecruiterProfileService,
  requireOwnedRecruiterEventService: mocks.requireOwnedRecruiterEventService,
}));

vi.mock("@/lib/db/repositories/event-repository", () => ({
  saveEventRepositoryAggregate: mocks.saveEventRepositoryAggregate,
  deleteEventRepositoryAggregate: vi.fn(),
}));

import { createEventService, updateEventService } from "@/lib/services/event-service";
import { buildDraftEvent } from "@/tests/helpers/fixtures";

describe("event creation service workspace scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentRecruiterProfileService.mockResolvedValue({
      actor: {
        currentRecruiterProfileId: "recruiter-aurora-quay",
        currentOrganizationId: "organization-aurora-quay",
      },
      profile: {
        id: "recruiter-aurora-quay",
      },
    });
    mocks.saveEventRepositoryAggregate.mockImplementation(async (event) => event);
  });

  it("creates new draft events inside the actor's active organization", async () => {
    const event = await createEventService({
      slug: "aurora-quay-opening-2026-08-01",
    });

    expect(event.organizationId).toBe("organization-aurora-quay");
    expect(event.recruiterProfileId).toBe("recruiter-aurora-quay");
    expect(mocks.saveEventRepositoryAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "organization-aurora-quay",
        recruiterProfileId: "recruiter-aurora-quay",
      }),
    );
  });

  it("rejects updating an event from another organization", async () => {
    const foreignEvent = buildDraftEvent({
      id: "event-foreign",
      organizationId: "organization-foreign",
      recruiterProfileId: "recruiter-foreign",
    });

    mocks.requireCurrentRecruiterProfileService.mockResolvedValue({
      actor: {
        currentRecruiterProfileId: "recruiter-aurora-quay",
        currentOrganizationId: "organization-aurora-quay",
      },
      profile: {
        id: "recruiter-aurora-quay",
      },
    });

    mocks.requireOwnedRecruiterEventService.mockResolvedValueOnce({
      actor: {
        currentRecruiterProfileId: "recruiter-aurora-quay",
        currentOrganizationId: "organization-aurora-quay",
      },
      event: foreignEvent,
    });

    await expect(updateEventService(foreignEvent.id, foreignEvent)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });
});
