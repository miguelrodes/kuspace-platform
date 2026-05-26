import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedSession: vi.fn(),
  requireRecruiterActor: vi.fn(),
  getCurrentOrganization: vi.fn(),
  getOrganizationRepositoryById: vi.fn(),
  getOrganizationsForClerkUserRepository: vi.fn(),
  getOrganizationMembershipRepository: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAuthenticatedSession: mocks.requireAuthenticatedSession,
}));

vi.mock("@/lib/auth/actor", () => ({
  requireRecruiterActor: mocks.requireRecruiterActor,
  getCurrentOrganization: mocks.getCurrentOrganization,
}));

vi.mock("@/lib/db/repositories/organization-repository", () => ({
  getOrganizationRepositoryById: mocks.getOrganizationRepositoryById,
  getOrganizationsForClerkUserRepository: mocks.getOrganizationsForClerkUserRepository,
  getOrganizationMembershipRepository: mocks.getOrganizationMembershipRepository,
}));

import {
  getCurrentWorkspaceService,
  listMyOrganizationsService,
  switchCurrentOrganizationService,
} from "@/lib/services/workspace-service";

describe("workspace service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedSession.mockResolvedValue({ userId: "clerk-user-1" });
    mocks.getOrganizationsForClerkUserRepository.mockResolvedValue([
      {
        organization: {
          id: "organization-1",
          slug: "aurora-quay",
          name: "Aurora Quay",
          type: "nightclub",
        },
        role: "owner",
      },
    ]);
    mocks.getCurrentOrganization.mockResolvedValue({
      actor: {
        clerkUserId: "clerk-user-1",
        currentOrganizationId: "organization-1",
        currentOrganizationRole: "owner",
      },
      organization: {
        id: "organization-1",
        slug: "aurora-quay",
        name: "Aurora Quay",
        type: "nightclub",
      },
    });
    mocks.requireRecruiterActor.mockResolvedValue({
      clerkUserId: "clerk-user-1",
    });
    mocks.getOrganizationRepositoryById.mockResolvedValue({
      id: "organization-2",
      slug: "space-berlin",
      name: "Space Berlin",
      type: "nightclub",
    });
  });

  it("lists the current user's organizations", async () => {
    const result = await listMyOrganizationsService();
    expect(result).toHaveLength(1);
    expect(result[0].organization.slug).toBe("aurora-quay");
  });

  it("returns current workspace context including available organizations", async () => {
    const result = await getCurrentWorkspaceService();
    expect(result.organization.slug).toBe("aurora-quay");
    expect(result.organizations).toHaveLength(1);
  });

  it("switches to a different organization only when the recruiter is a member", async () => {
    mocks.getOrganizationMembershipRepository.mockResolvedValue({
      role: "member",
      organization: {
        id: "organization-2",
        slug: "space-berlin",
        name: "Space Berlin",
        type: "nightclub",
      },
    });

    const result = await switchCurrentOrganizationService("organization-2");
    expect(result.organization.slug).toBe("space-berlin");
    expect(result.role).toBe("member");
  });

  it("returns 404 when switching to a workspace that does not exist", async () => {
    mocks.getOrganizationRepositoryById.mockResolvedValue(null);

    await expect(switchCurrentOrganizationService("organization-missing")).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("returns 403 when switching to a workspace the recruiter does not belong to", async () => {
    mocks.getOrganizationMembershipRepository.mockResolvedValue(null);

    await expect(switchCurrentOrganizationService("organization-2")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });
});
