import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDraftEvent } from "@/tests/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireOrganizationMember: vi.fn(),
  getEventRepositoryById: vi.fn(),
}));

vi.mock("@/lib/auth/actor", () => ({
  requireOrganizationMember: mocks.requireOrganizationMember,
}));

vi.mock("@/lib/db/repositories/event-repository", () => ({
  getEventRepositoryById: mocks.getEventRepositoryById,
}));

import { requireOwnedRecruiterEventService } from "@/lib/services/access-service";

describe("event management ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOrganizationMember.mockResolvedValue({
      actor: { currentOrganizationId: "organization-space" },
    });
  });

  it("rejects a foreign event in the service before an editor can load it", async () => {
    const dc10Event = buildDraftEvent({
      id: "event-dc10",
      organizationId: "organization-dc10",
    });
    mocks.getEventRepositoryById.mockResolvedValue(dc10Event);

    await expect(requireOwnedRecruiterEventService(dc10Event.id, "view"))
      .rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("rejects updates to an event outside the active organization", async () => {
    const dc10Event = buildDraftEvent({
      id: "event-dc10",
      organizationId: "organization-dc10",
    });
    mocks.getEventRepositoryById.mockResolvedValue(dc10Event);

    await expect(requireOwnedRecruiterEventService(dc10Event.id, "update"))
      .rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("allows an event in the active organization", async () => {
    const spaceEvent = buildDraftEvent({
      id: "event-space",
      organizationId: "organization-space",
    });
    mocks.getEventRepositoryById.mockResolvedValue(spaceEvent);

    await expect(requireOwnedRecruiterEventService(spaceEvent.id, "view"))
      .resolves.toMatchObject({ event: spaceEvent });
  });
});
