import { beforeEach, describe, expect, it, vi } from "vitest";
import { conflict, forbidden, notFound, unauthorized } from "@/lib/http/errors";

const organizationServiceMocks = vi.hoisted(() => ({
  createOrganizationService: vi.fn(),
  getCurrentOrganizationService: vi.fn(),
  updateCurrentOrganizationService: vi.fn(),
  createCurrentOrganizationStripeAccountService: vi.fn(),
  createCurrentOrganizationStripeOnboardingLinkService: vi.fn(),
  syncCurrentOrganizationStripeAccountStatusService: vi.fn(),
}));

const workspaceServiceMocks = vi.hoisted(() => ({
  switchCurrentOrganizationService: vi.fn(),
  listMyOrganizationsService: vi.fn(),
}));

vi.mock("@/lib/services/organization-service", () => ({
  createOrganizationService: organizationServiceMocks.createOrganizationService,
  getCurrentOrganizationService: organizationServiceMocks.getCurrentOrganizationService,
  updateCurrentOrganizationService: organizationServiceMocks.updateCurrentOrganizationService,
  createCurrentOrganizationStripeAccountService:
    organizationServiceMocks.createCurrentOrganizationStripeAccountService,
  createCurrentOrganizationStripeOnboardingLinkService:
    organizationServiceMocks.createCurrentOrganizationStripeOnboardingLinkService,
  syncCurrentOrganizationStripeAccountStatusService:
    organizationServiceMocks.syncCurrentOrganizationStripeAccountStatusService,
}));

vi.mock("@/lib/services/workspace-service", () => ({
  switchCurrentOrganizationService: workspaceServiceMocks.switchCurrentOrganizationService,
  listMyOrganizationsService: workspaceServiceMocks.listMyOrganizationsService,
}));

import { GET as listOrganizationsRoute, POST as createOrganizationRoute } from "@/app/api/workspace/organizations/route";
import { GET as currentOrganizationRoute, PATCH as updateOrganizationRoute } from "@/app/api/workspace/organizations/current/route";
import { POST as createConnectedAccountRoute } from "@/app/api/workspace/organizations/current/connect-account/route";
import { GET as createOnboardingRoute } from "@/app/api/workspace/organizations/current/connect-account/onboarding/route";
import { GET as refreshOnboardingRoute } from "@/app/api/workspace/organizations/current/connect-account/onboarding/refresh/route";
import { GET as returnOnboardingRoute } from "@/app/api/workspace/organizations/current/connect-account/onboarding/return/route";
import { GET as syncStripeStatusRoute } from "@/app/api/workspace/organizations/current/connect-account/status/route";
import { POST as switchOrganizationRoute } from "@/app/api/workspace/organizations/current/switch/route";

vi.mock("@/lib/stripe/config", () => ({
  getStripeConfig: vi.fn(() => ({
    STRIPE_CONNECT_RETURN_URL: "http://localhost:3000/office",
    STRIPE_CONNECT_REFRESH_URL: "http://localhost:3000/office",
    STRIPE_SECRET_KEY: "sk_test_123",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123",
    STRIPE_WEBHOOK_SECRET: "whsec_123",
    STRIPE_CHECKOUT_SUCCESS_URL: "http://localhost:3000/tickets",
    STRIPE_CHECKOUT_CANCEL_URL: "http://localhost:3000/tickets",
  })),
}));

describe("workspace route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 with a stable error shape when workspace auth fails", async () => {
    organizationServiceMocks.getCurrentOrganizationService.mockRejectedValue(unauthorized());

    const response = await currentOrganizationRoute();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        status: 401,
        details: undefined,
      },
    });
  });

  it("returns 400 on invalid workspace update payloads before the service runs", async () => {
    const response = await updateOrganizationRoute(
      new Request("http://localhost/api/workspace/organizations/current", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "", slug: "", type: "banana" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(organizationServiceMocks.updateCurrentOrganizationService).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        status: 400,
      },
    });
  });

  it("returns 400 on invalid connected-account payloads before the service runs", async () => {
    const response = await createConnectedAccountRoute(
      new Request("http://localhost/api/workspace/organizations/current/connect-account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ country: "spain" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(organizationServiceMocks.createCurrentOrganizationStripeAccountService).not.toHaveBeenCalled();
  });

  it("returns 409 for duplicate workspace slug conflicts", async () => {
    organizationServiceMocks.createOrganizationService.mockRejectedValue(
      conflict("An organization with this slug already exists."),
    );

    const request = new Request("http://localhost/api/workspace/organizations", {
      method: "POST",
      body: new URLSearchParams({
        name: "Aurora Quay",
        slug: "aurora-quay",
        type: "nightclub",
      }),
    });

    const response = await createOrganizationRoute(request);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "CONFLICT",
        status: 409,
      },
    });
  });

  it("redirects to Stripe-hosted onboarding for the current owner workspace", async () => {
    organizationServiceMocks.createCurrentOrganizationStripeOnboardingLinkService.mockResolvedValue({
      onboardingUrl: "https://connect.stripe.test/account-link",
    });

    const response = await createOnboardingRoute(
      new Request("http://localhost/api/workspace/organizations/current/connect-account/onboarding"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://connect.stripe.test/account-link");
  });

  it("refreshes the onboarding link through a redirect route", async () => {
    organizationServiceMocks.createCurrentOrganizationStripeOnboardingLinkService.mockResolvedValue({
      onboardingUrl: "https://connect.stripe.test/account-link-refresh",
    });

    const response = await refreshOnboardingRoute(
      new Request("http://localhost/api/workspace/organizations/current/connect-account/onboarding/refresh"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://connect.stripe.test/account-link-refresh",
    );
  });

  it("redirects back to office after syncing Stripe onboarding status", async () => {
    organizationServiceMocks.syncCurrentOrganizationStripeAccountStatusService.mockResolvedValue({
      onboardingComplete: false,
    });

    const response = await returnOnboardingRoute();

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/office?stripeConnectReturn=1&stripeConnectStatus=pending",
    );
  });

  it("redirects back to office after manually refreshing Stripe status", async () => {
    organizationServiceMocks.syncCurrentOrganizationStripeAccountStatusService.mockResolvedValue({
      onboardingComplete: true,
    });

    const response = await syncStripeStatusRoute();

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/office?stripeConnectRefresh=1&stripeConnectStatus=ready",
    );
  });

  it("returns 404 when the requested workspace does not exist during switching", async () => {
    workspaceServiceMocks.switchCurrentOrganizationService.mockRejectedValue(
      notFound("Workspace not found."),
    );

    const response = await switchOrganizationRoute(
      new Request("http://localhost/api/workspace/organizations/current/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId: "organization-missing" }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Workspace not found.",
        code: "NOT_FOUND",
        status: 404,
      },
    });
  });

  it("returns 403 when switching into a workspace the recruiter does not belong to", async () => {
    workspaceServiceMocks.switchCurrentOrganizationService.mockRejectedValue(
      forbidden("You are not a member of this workspace."),
    );

    const response = await switchOrganizationRoute(
      new Request("http://localhost/api/workspace/organizations/current/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId: "organization-foreign" }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        message: "You are not a member of this workspace.",
        code: "FORBIDDEN",
        status: 403,
      },
    });
  });

  it("returns happy-path responses for organization listing, creation, update, and switching", async () => {
    workspaceServiceMocks.listMyOrganizationsService.mockResolvedValue([
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
    organizationServiceMocks.createOrganizationService.mockResolvedValue({
      organization: {
        id: "organization-1",
        slug: "aurora-quay",
        name: "Aurora Quay",
        type: "nightclub",
      },
      destination: "/office",
    });
    organizationServiceMocks.getCurrentOrganizationService.mockResolvedValue({
      organization: {
        id: "organization-1",
        slug: "aurora-quay",
        name: "Aurora Quay",
        type: "nightclub",
      },
      organizations: [],
    });
    organizationServiceMocks.updateCurrentOrganizationService.mockResolvedValue({
      id: "organization-1",
      slug: "space-worldwide",
      name: "Space Worldwide",
      type: "label",
    });
    organizationServiceMocks.createCurrentOrganizationStripeAccountService.mockResolvedValue({
      organization: {
        id: "organization-1",
        slug: "space-worldwide",
        name: "Space Worldwide",
        type: "label",
        stripeAccountId: "acct_123",
      },
      stripeAccountCreated: true,
    });
    organizationServiceMocks.createCurrentOrganizationStripeOnboardingLinkService.mockResolvedValue({
      onboardingUrl: "https://connect.stripe.test/account-link",
    });
    organizationServiceMocks.syncCurrentOrganizationStripeAccountStatusService.mockResolvedValue({
      onboardingComplete: true,
    });
    workspaceServiceMocks.switchCurrentOrganizationService.mockResolvedValue({
      organization: {
        id: "organization-2",
        slug: "space-berlin",
        name: "Space Berlin",
        type: "nightclub",
      },
      role: "member",
    });

    const listResponse = await listOrganizationsRoute();
    expect(listResponse.status).toBe(200);

    const createResponse = await createOrganizationRoute(
      new Request("http://localhost/api/workspace/organizations", {
        method: "POST",
        body: new URLSearchParams({
          name: "Aurora Quay",
          slug: "aurora-quay",
          type: "nightclub",
        }),
      }),
    );
    expect(createResponse.status).toBe(303);

    const currentResponse = await currentOrganizationRoute();
    expect(currentResponse.status).toBe(200);

    const updateResponse = await updateOrganizationRoute(
      new Request("http://localhost/api/workspace/organizations/current", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Space Worldwide",
          slug: "space-worldwide",
          type: "label",
        }),
      }),
    );
    expect(updateResponse.status).toBe(200);

    const connectResponse = await createConnectedAccountRoute(
      new Request("http://localhost/api/workspace/organizations/current/connect-account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ country: "ES" }),
      }),
    );
    expect(connectResponse.status).toBe(200);

    const onboardingResponse = await createOnboardingRoute(
      new Request("http://localhost/api/workspace/organizations/current/connect-account/onboarding"),
    );
    expect(onboardingResponse.status).toBe(303);

    const onboardingReturnResponse = await returnOnboardingRoute();
    expect(onboardingReturnResponse.status).toBe(303);

    const switchResponse = await switchOrganizationRoute(
      new Request("http://localhost/api/workspace/organizations/current/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId: "organization-2" }),
      }),
    );
    expect(switchResponse.status).toBe(200);
  });
});
