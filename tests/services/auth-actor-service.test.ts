import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getAuthSession: vi.fn(),
  requireAuthenticatedSession: vi.fn(),
  getActorBindingRepository: vi.fn(),
  createOrLinkConsumerForClerkRepository: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: mocks.currentUser,
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthSession: mocks.getAuthSession,
  requireAuthenticatedSession: mocks.requireAuthenticatedSession,
}));

vi.mock("@/lib/repositories/auth-actor-repository", () => ({
  getActorBindingRepository: mocks.getActorBindingRepository,
  createOrLinkConsumerForClerkRepository: mocks.createOrLinkConsumerForClerkRepository,
}));

import {
  getCurrentAppActorService,
  selectCurrentAppActorService,
} from "@/lib/services/auth-actor-service";

describe("auth actor service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({
      get: vi.fn(() => undefined),
    });
    mocks.getAuthSession.mockResolvedValue({ userId: "clerk-user-1", isAuthenticated: true });
    mocks.requireAuthenticatedSession.mockResolvedValue({ userId: "clerk-user-1", isAuthenticated: true });
    mocks.currentUser.mockResolvedValue({
      firstName: "Luca",
      lastName: "Dea",
      imageUrl: "https://example.com/avatar.png",
      primaryEmailAddress: { emailAddress: "luca@example.com" },
      emailAddresses: [{ emailAddress: "luca@example.com" }],
    });
  });

  it("keeps existing demo-linked recruiters in their seeded workspace", async () => {
    mocks.getActorBindingRepository.mockResolvedValue({
      consumerUserId: null,
      recruiterProfileId: "recruiter-neon-harbor",
      currentOrganizationId: "organization-recruiter-neon-harbor",
      currentOrganizationRole: "owner",
    });

    const actor = await getCurrentAppActorService();

    expect(actor).toMatchObject({
      role: "recruiter",
      currentRecruiterProfileId: "recruiter-neon-harbor",
      currentOrganizationId: "organization-recruiter-neon-harbor",
      needsOrganizationSetup: false,
    });
  });

  it("resolves consumers without workspace state", async () => {
    mocks.getActorBindingRepository.mockResolvedValue({
      consumerUserId: "consumer-luca-dea",
      recruiterProfileId: null,
      currentOrganizationId: null,
      currentOrganizationRole: null,
    });

    const actor = await getCurrentAppActorService();

    expect(actor).toMatchObject({
      role: "consumer",
      currentConsumerUserId: "consumer-luca-dea",
      currentOrganizationId: null,
      needsOrganizationSetup: false,
    });
  });

  it("sends first-time recruiters to organization creation instead of the demo workspace", async () => {
    mocks.getActorBindingRepository.mockResolvedValue({
      consumerUserId: null,
      recruiterProfileId: null,
      currentOrganizationId: null,
      currentOrganizationRole: null,
    });

    const result = await selectCurrentAppActorService("recruiter");

    expect(result).toMatchObject({
      role: "recruiter",
      currentRecruiterProfileId: null,
      currentOrganizationId: null,
      needsOrganizationSetup: true,
      destination: "/create-organization",
    });
  });

  it("creates a consumer account and routes to the consumer home when consumer is selected", async () => {
    mocks.getActorBindingRepository.mockResolvedValue({
      consumerUserId: null,
      recruiterProfileId: null,
      currentOrganizationId: null,
      currentOrganizationRole: null,
    });
    mocks.createOrLinkConsumerForClerkRepository.mockResolvedValue({
      id: "consumer-luca-dea",
    });

    const result = await selectCurrentAppActorService("consumer");

    expect(mocks.createOrLinkConsumerForClerkRepository).toHaveBeenCalled();
    expect(result).toMatchObject({
      role: "consumer",
      currentConsumerUserId: "consumer-luca-dea",
      destination: "/conshome",
    });
  });
});
