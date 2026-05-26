import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  requireAuthenticatedSession: vi.fn(),
  getCurrentAppActorService: vi.fn(),
  getOrganizationRepositoryBySlug: vi.fn(),
  createOrganizationRepository: vi.fn(),
  createOrganizationMembershipRepository: vi.fn(),
  updateOrganizationRepository: vi.fn(),
  updateOrganizationStripeConnectRepository: vi.fn(),
  saveRecruiterRepository: vi.fn(),
  getCurrentUserOrganizationMembershipsService: vi.fn(),
  requireCurrentRecruiterProfileService: vi.fn(),
  getCurrentWorkspaceService: vi.fn(),
  getStripeServerClient: vi.fn(),
  getStripeConfig: vi.fn(),
  stripeAccountsCreate: vi.fn(),
  stripeAccountsRetrieve: vi.fn(),
  stripeAccountLinksCreate: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: mocks.currentUser,
}));

vi.mock("@/lib/auth/session", () => ({
  requireAuthenticatedSession: mocks.requireAuthenticatedSession,
}));

vi.mock("@/lib/services/auth-actor-service", () => ({
  getCurrentAppActorService: mocks.getCurrentAppActorService,
}));

vi.mock("@/lib/db/repositories/organization-repository", () => ({
  getOrganizationRepositoryBySlug: mocks.getOrganizationRepositoryBySlug,
  createOrganizationRepository: mocks.createOrganizationRepository,
  createOrganizationMembershipRepository: mocks.createOrganizationMembershipRepository,
  updateOrganizationRepository: mocks.updateOrganizationRepository,
  updateOrganizationStripeConnectRepository: mocks.updateOrganizationStripeConnectRepository,
}));

vi.mock("@/lib/db/repositories/recruiter-repository", () => ({
  saveRecruiterRepository: mocks.saveRecruiterRepository,
}));

vi.mock("@/lib/services/organization-membership-service", () => ({
  getCurrentUserOrganizationMembershipsService: mocks.getCurrentUserOrganizationMembershipsService,
}));

vi.mock("@/lib/services/access-service", () => ({
  requireCurrentRecruiterProfileService: mocks.requireCurrentRecruiterProfileService,
}));

vi.mock("@/lib/services/workspace-service", () => ({
  getCurrentWorkspaceService: mocks.getCurrentWorkspaceService,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripeServerClient: mocks.getStripeServerClient,
}));

vi.mock("@/lib/stripe/config", () => ({
  getStripeConfig: mocks.getStripeConfig,
}));

import {
  createCurrentOrganizationStripeAccountService,
  createCurrentOrganizationStripeOnboardingLinkService,
  createOrganizationService,
  getCurrentOrganizationService,
  normalizeOrganizationSlug,
  syncCurrentOrganizationStripeAccountStatusService,
  updateCurrentOrganizationService,
} from "@/lib/services/organization-service";

describe("organization service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedSession.mockResolvedValue({ userId: "clerk-user-1" });
    mocks.currentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "owner@example.com" },
      emailAddresses: [{ emailAddress: "owner@example.com" }],
      imageUrl: "https://example.com/avatar.png",
    });
    mocks.getOrganizationRepositoryBySlug.mockResolvedValue(null);
    mocks.getCurrentUserOrganizationMembershipsService.mockResolvedValue([]);
    mocks.createOrganizationRepository.mockResolvedValue({
      id: "organization-1",
      slug: "aurora-quay",
      name: "Aurora Quay",
      type: "nightclub",
    });
    mocks.createOrganizationMembershipRepository.mockResolvedValue({
      id: "membership-1",
      organizationId: "organization-1",
      clerkUserId: "clerk-user-1",
      role: "owner",
    });
    mocks.saveRecruiterRepository.mockImplementation(async (profile) => profile);
    mocks.updateOrganizationRepository.mockImplementation(async (_id, input) => ({
      id: "organization-1",
      slug: input.slug,
      name: input.name,
      type: input.type,
    }));
    mocks.updateOrganizationStripeConnectRepository.mockImplementation(async (_id, input) => ({
      id: "organization-1",
      slug: "aurora-quay",
      name: "Aurora Quay",
      type: "nightclub",
      stripeAccountId: input.stripeAccountId ?? undefined,
      stripeChargesEnabled: input.stripeChargesEnabled ?? false,
      stripePayoutsEnabled: input.stripePayoutsEnabled ?? false,
      stripeDetailsSubmitted: input.stripeDetailsSubmitted ?? false,
      stripeOnboardingStartedAt: input.stripeOnboardingStartedAt?.toISOString(),
      stripeOnboardingCompletedAt: input.stripeOnboardingCompletedAt?.toISOString(),
    }));
    mocks.requireCurrentRecruiterProfileService.mockResolvedValue({
      actor: {
        currentRecruiterProfileId: "recruiter-organization-1",
      },
      profile: {
        id: "recruiter-organization-1",
        clerkUserId: "clerk-user-1",
        organizationId: "organization-1",
        slug: "aurora-quay",
        recruiterType: "nightclub",
        displayName: "Aurora Quay",
      },
    });
    mocks.getCurrentWorkspaceService.mockResolvedValue({
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
        stripeAccountId: undefined,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        stripeOnboardingStartedAt: undefined,
        stripeOnboardingCompletedAt: undefined,
      },
      organizations: [
        {
          organization: {
            id: "organization-1",
            slug: "aurora-quay",
            name: "Aurora Quay",
            type: "nightclub",
            stripeAccountId: undefined,
            stripeChargesEnabled: false,
            stripePayoutsEnabled: false,
            stripeDetailsSubmitted: false,
            stripeOnboardingStartedAt: undefined,
            stripeOnboardingCompletedAt: undefined,
          },
          role: "owner",
        },
      ],
    });
    mocks.stripeAccountsCreate.mockResolvedValue({
      id: "acct_123",
    });
    mocks.stripeAccountsRetrieve.mockResolvedValue({
      id: "acct_123",
      requirements: {
        entries: [],
      },
      configuration: {
        merchant: {
          capabilities: {
            card_payments: { status: "active", status_details: [] },
          },
        },
        recipient: {
          capabilities: {
            stripe_balance: {
              payouts: { status: "active", status_details: [] },
              stripe_transfers: { status: "active", status_details: [] },
            },
          },
        },
      },
    });
    mocks.stripeAccountLinksCreate.mockResolvedValue({
      url: "https://connect.stripe.test/account-link",
      expires_at: "2026-04-27T18:00:00.000Z",
    });
    mocks.getStripeServerClient.mockReturnValue({
      v2: {
        core: {
          accounts: {
            create: mocks.stripeAccountsCreate,
            retrieve: mocks.stripeAccountsRetrieve,
          },
          accountLinks: {
            create: mocks.stripeAccountLinksCreate,
          },
        },
      },
    });
    mocks.getStripeConfig.mockReturnValue({
      STRIPE_SECRET_KEY: "sk_test_123",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
      STRIPE_CONNECT_RETURN_URL: "http://localhost:3000/office",
      STRIPE_CONNECT_REFRESH_URL: "http://localhost:3000/office",
      STRIPE_CHECKOUT_SUCCESS_URL: "http://localhost:3000/tickets",
      STRIPE_CHECKOUT_CANCEL_URL: "http://localhost:3000/tickets",
    });
  });

  it("creates an owner workspace and recruiter profile for first-time recruiter onboarding", async () => {
    mocks.getCurrentAppActorService.mockResolvedValue({
      role: null,
      currentConsumerUserId: null,
      currentRecruiterProfileId: null,
      currentOrganizationId: null,
      currentOrganizationRole: null,
      needsActorSelection: true,
      needsOrganizationSetup: false,
    });

    const result = await createOrganizationService({
      name: "Aurora Quay",
      slug: "Aurora Quay",
      type: "nightclub",
      locationDisplayText: "Madrid",
    });

    expect(mocks.createOrganizationRepository).toHaveBeenCalledWith({
      name: "Aurora Quay",
      slug: "aurora-quay",
      type: "nightclub",
      locationDisplayText: "Madrid",
    });
    expect(mocks.createOrganizationMembershipRepository).toHaveBeenCalledWith({
      organizationId: "organization-1",
      clerkUserId: "clerk-user-1",
      role: "owner",
    });
    expect(mocks.saveRecruiterRepository).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "organization-1",
        clerkUserId: "clerk-user-1",
        slug: "aurora-quay",
        displayName: "Aurora Quay",
        location: { displayText: "Madrid" },
      }),
    );
    expect(result.destination).toBe("/office");
  });

  it("normalizes organization slugs consistently", () => {
    expect(normalizeOrganizationSlug("  Aurora Quay!!!  ")).toBe("aurora-quay");
    expect(normalizeOrganizationSlug("A__Very Long Workspace Name__2026")).toBe(
      "a-very-long-workspace-name-2026",
    );
  });

  it("rejects consumer accounts from creating recruiter workspaces", async () => {
    mocks.getCurrentAppActorService.mockResolvedValue({
      role: "consumer",
      currentConsumerUserId: "consumer-1",
      currentRecruiterProfileId: null,
      currentOrganizationId: null,
      currentOrganizationRole: null,
      needsActorSelection: false,
      needsOrganizationSetup: false,
    });

    await expect(
      createOrganizationService({
        name: "Aurora Quay",
        slug: "aurora-quay",
        type: "nightclub",
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("rejects workspace creation when the recruiter already has an active workspace", async () => {
    mocks.getCurrentAppActorService.mockResolvedValue({
      role: "recruiter",
      currentConsumerUserId: null,
      currentRecruiterProfileId: "recruiter-organization-1",
      currentOrganizationId: "organization-1",
      currentOrganizationRole: "owner",
      needsActorSelection: false,
      needsOrganizationSetup: false,
    });

    await expect(
      createOrganizationService({
        name: "Aurora Quay",
        slug: "aurora-quay",
        type: "nightclub",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
    });
  });

  it("rejects duplicate organization slugs during creation", async () => {
    mocks.getCurrentAppActorService.mockResolvedValue({
      role: null,
      currentConsumerUserId: null,
      currentRecruiterProfileId: null,
      currentOrganizationId: null,
      currentOrganizationRole: null,
      needsActorSelection: true,
      needsOrganizationSetup: false,
    });
    mocks.getOrganizationRepositoryBySlug.mockResolvedValue({
      id: "organization-existing",
      slug: "aurora-quay",
      name: "Aurora Quay",
      type: "nightclub",
    });

    await expect(
      createOrganizationService({
        name: "Aurora Quay",
        slug: "aurora-quay",
        type: "nightclub",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
    });
  });

  it("returns the current workspace context for recruiter routes", async () => {
    const result = await getCurrentOrganizationService();
    expect(result.organization.slug).toBe("aurora-quay");
    expect(result.organizations).toHaveLength(1);
  });

  it("updates current organization basic details and syncs the linked recruiter profile", async () => {
    mocks.getOrganizationRepositoryBySlug.mockResolvedValue(null);

    const result = await updateCurrentOrganizationService({
      name: "Space Worldwide",
      slug: "Space Worldwide",
      type: "label",
      locationDisplayText: "Northport",
    });

    expect(mocks.updateOrganizationRepository).toHaveBeenCalledWith("organization-1", {
      name: "Space Worldwide",
      slug: "space-worldwide",
      type: "label",
      locationDisplayText: "Northport",
    });
    expect(mocks.saveRecruiterRepository).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "organization-1",
        slug: "space-worldwide",
        displayName: "Space Worldwide",
        recruiterType: "label",
        location: { displayText: "Northport" },
      }),
    );
    expect(result.slug).toBe("space-worldwide");
  });

  it("rejects non-owner workspace updates", async () => {
    mocks.getCurrentWorkspaceService.mockResolvedValue({
      actor: {
        clerkUserId: "clerk-user-1",
        currentOrganizationId: "organization-1",
        currentOrganizationRole: "member",
      },
      organization: {
        id: "organization-1",
        slug: "aurora-quay",
        name: "Aurora Quay",
        type: "nightclub",
      },
      organizations: [],
    });

    await expect(
      updateCurrentOrganizationService({
        name: "Space Worldwide",
        slug: "space-worldwide",
        type: "label",
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("rejects updates when the target slug belongs to another organization", async () => {
    mocks.getOrganizationRepositoryBySlug.mockResolvedValue({
      id: "organization-2",
      slug: "space-worldwide",
      name: "Space Worldwide",
      type: "label",
    });

    await expect(
      updateCurrentOrganizationService({
        name: "Space Worldwide",
        slug: "space-worldwide",
        type: "label",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
    });
  });

  it("creates a Stripe connected account for the current owner workspace", async () => {
    const result = await createCurrentOrganizationStripeAccountService({
      country: "es",
    });

    expect(mocks.stripeAccountsCreate).toHaveBeenCalledWith({
      configuration: {
        merchant: {
          capabilities: {
            card_payments: { requested: true },
          },
        },
        recipient: {
          capabilities: {
            stripe_balance: {
              payouts: { requested: true },
              stripe_transfers: { requested: true },
            },
          },
        },
      },
      contact_email: "owner@example.com",
      dashboard: "express",
      defaults: {
        profile: {
          doing_business_as: "Aurora Quay",
          product_description: "Event ticket sales and access managed through KUSPACE.",
        },
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
        },
      },
      display_name: "Aurora Quay",
      identity: {
        country: "ES",
      },
      metadata: {
        organizationId: "organization-1",
        organizationSlug: "aurora-quay",
        organizationType: "nightclub",
      },
    });
    expect(mocks.updateOrganizationStripeConnectRepository).toHaveBeenCalledWith("organization-1", {
      stripeAccountId: "acct_123",
    });
    expect(result).toEqual({
      organization: expect.objectContaining({
        id: "organization-1",
        stripeAccountId: "acct_123",
      }),
      stripeAccountCreated: true,
    });
  });

  it("returns the existing connected account without creating a duplicate", async () => {
    mocks.getCurrentWorkspaceService.mockResolvedValue({
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
        stripeAccountId: "acct_existing",
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        stripeOnboardingStartedAt: undefined,
        stripeOnboardingCompletedAt: undefined,
      },
      organizations: [],
    });

    const result = await createCurrentOrganizationStripeAccountService();

    expect(mocks.stripeAccountsCreate).not.toHaveBeenCalled();
    expect(mocks.updateOrganizationStripeConnectRepository).not.toHaveBeenCalled();
    expect(result).toEqual({
      organization: expect.objectContaining({
        stripeAccountId: "acct_existing",
      }),
      stripeAccountCreated: false,
    });
  });

  it("rejects connected-account creation for non-owner members", async () => {
    mocks.getCurrentWorkspaceService.mockResolvedValue({
      actor: {
        clerkUserId: "clerk-user-1",
        currentOrganizationId: "organization-1",
        currentOrganizationRole: "member",
      },
      organization: {
        id: "organization-1",
        slug: "aurora-quay",
        name: "Aurora Quay",
        type: "nightclub",
      },
      organizations: [],
    });

    await expect(createCurrentOrganizationStripeAccountService()).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("rejects connected-account creation when the owner has no verified email", async () => {
    mocks.currentUser.mockResolvedValue({
      primaryEmailAddress: null,
      emailAddresses: [],
      imageUrl: "https://example.com/avatar.png",
    });

    await expect(createCurrentOrganizationStripeAccountService()).rejects.toMatchObject({
      status: 400,
      code: "BAD_REQUEST",
    });
    expect(mocks.stripeAccountsCreate).not.toHaveBeenCalled();
  });

  it("creates a Stripe-hosted onboarding link and stamps onboarding start time", async () => {
    const result = await createCurrentOrganizationStripeOnboardingLinkService({
      requestUrl: "http://localhost/api/workspace/organizations/current/connect-account/onboarding",
      country: "ES",
    });

    expect(mocks.stripeAccountLinksCreate).toHaveBeenCalledWith({
      account: "acct_123",
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          collection_options: {
            fields: "eventually_due",
            future_requirements: "include",
          },
          configurations: ["merchant", "recipient"],
          refresh_url:
            "http://localhost/api/workspace/organizations/current/connect-account/onboarding/refresh",
          return_url:
            "http://localhost/api/workspace/organizations/current/connect-account/onboarding/return",
        },
      },
    });
    expect(result).toEqual({
      organization: expect.objectContaining({
        stripeAccountId: "acct_123",
      }),
      stripeAccountCreated: true,
      onboardingUrl: "https://connect.stripe.test/account-link",
      expiresAt: "2026-04-27T18:00:00.000Z",
      returnDestination: "http://localhost:3000/office",
      refreshDestination: "http://localhost:3000/office",
    });
  });

  it("reuses the existing Stripe account when generating an onboarding link", async () => {
    mocks.getCurrentWorkspaceService.mockResolvedValue({
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
        stripeAccountId: "acct_existing",
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        stripeOnboardingStartedAt: "2026-04-26T10:00:00.000Z",
        stripeOnboardingCompletedAt: undefined,
      },
      organizations: [],
    });

    const result = await createCurrentOrganizationStripeOnboardingLinkService({
      requestUrl: "http://localhost/api/workspace/organizations/current/connect-account/onboarding",
    });

    expect(mocks.stripeAccountsCreate).not.toHaveBeenCalled();
    expect(mocks.stripeAccountLinksCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        account: "acct_existing",
      }),
    );
    expect(result.stripeAccountCreated).toBe(false);
  });

  it("syncs Stripe status back into the workspace organization flags", async () => {
    mocks.getCurrentWorkspaceService.mockResolvedValue({
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
        stripeAccountId: "acct_123",
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        stripeOnboardingStartedAt: undefined,
        stripeOnboardingCompletedAt: undefined,
      },
      organizations: [],
    });

    const result = await syncCurrentOrganizationStripeAccountStatusService();

    expect(mocks.stripeAccountsRetrieve).toHaveBeenCalledWith("acct_123", {
      include: ["configuration.merchant", "configuration.recipient", "requirements"],
    });
    expect(mocks.updateOrganizationStripeConnectRepository).toHaveBeenCalledWith(
      "organization-1",
      expect.objectContaining({
        stripeAccountId: "acct_123",
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeDetailsSubmitted: true,
      }),
    );
    expect(result).toEqual({
      organization: expect.objectContaining({
        stripeAccountId: "acct_123",
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeDetailsSubmitted: true,
      }),
      statusSynced: true,
      onboardingComplete: true,
    });
  });

  it("marks details submitted once only Stripe-side verification is pending", async () => {
    mocks.getCurrentWorkspaceService.mockResolvedValue({
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
        stripeAccountId: "acct_123",
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        stripeOnboardingStartedAt: undefined,
        stripeOnboardingCompletedAt: undefined,
      },
      organizations: [],
    });

    mocks.stripeAccountsRetrieve.mockResolvedValue({
      id: "acct_123",
      requirements: {
        entries: [
          {
            awaiting_action_from: "stripe",
          },
        ],
      },
      configuration: {
        merchant: {
          capabilities: {
            card_payments: { status: "pending", status_details: [] },
          },
        },
        recipient: {
          capabilities: {
            stripe_balance: {
              payouts: { status: "pending", status_details: [] },
              stripe_transfers: { status: "active", status_details: [] },
            },
          },
        },
      },
    });

    const result = await syncCurrentOrganizationStripeAccountStatusService();

    expect(result).toEqual({
      organization: expect.objectContaining({
        stripeDetailsSubmitted: true,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
      }),
      statusSynced: true,
      onboardingComplete: false,
    });
  });

  it("keeps details submitted false when the user still owes Stripe information", async () => {
    mocks.getCurrentWorkspaceService.mockResolvedValue({
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
        stripeAccountId: "acct_123",
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        stripeOnboardingStartedAt: undefined,
        stripeOnboardingCompletedAt: undefined,
      },
      organizations: [],
    });

    mocks.stripeAccountsRetrieve.mockResolvedValue({
      id: "acct_123",
      requirements: {
        entries: [
          {
            awaiting_action_from: "user",
          },
        ],
      },
      configuration: {
        merchant: {
          capabilities: {
            card_payments: { status: "restricted", status_details: [] },
          },
        },
        recipient: {
          capabilities: {
            stripe_balance: {
              payouts: { status: "restricted", status_details: [] },
              stripe_transfers: { status: "active", status_details: [] },
            },
          },
        },
      },
    });

    const result = await syncCurrentOrganizationStripeAccountStatusService();

    expect(result).toEqual({
      organization: expect.objectContaining({
        stripeDetailsSubmitted: false,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
      }),
      statusSynced: true,
      onboardingComplete: false,
    });
  });

  it("returns the current organization untouched when no Stripe account exists during sync", async () => {
    mocks.getCurrentWorkspaceService.mockResolvedValue({
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
        stripeAccountId: undefined,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        stripeOnboardingStartedAt: undefined,
        stripeOnboardingCompletedAt: undefined,
      },
      organizations: [],
    });

    const result = await syncCurrentOrganizationStripeAccountStatusService();

    expect(mocks.stripeAccountsRetrieve).not.toHaveBeenCalled();
    expect(result).toEqual({
      organization: expect.objectContaining({
        stripeAccountId: undefined,
      }),
      statusSynced: false,
      onboardingComplete: false,
    });
  });
});
