import { beforeEach, describe, expect, it, vi } from "vitest";
import { unauthorized } from "@/lib/http/errors";

const authMocks = vi.hoisted(() => ({
  requireConsumerActor: vi.fn(),
}));

const checkoutServiceMocks = vi.hoisted(() => ({
  createCheckoutIntentService: vi.fn(),
}));

vi.mock("@/lib/auth/actor", () => ({
  requireConsumerActor: authMocks.requireConsumerActor,
}));

vi.mock("@/lib/services/checkout-service", () => ({
  createCheckoutIntentService: checkoutServiceMocks.createCheckoutIntentService,
}));

import { POST as checkoutIntentRoute } from "@/app/api/store/events/[id]/checkout-intents/route";

describe("checkout-intent route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireConsumerActor.mockResolvedValue({
      role: "consumer",
      clerkUserId: "clerk-user-1",
      currentConsumerUserId: "consumer-1",
      currentRecruiterProfileId: null,
    });
  });

  it("returns 401 with a stable error shape when consumer auth fails", async () => {
    authMocks.requireConsumerActor.mockRejectedValue(unauthorized());

    const response = await checkoutIntentRoute(
      new Request("http://localhost/api/store/events/event-1/checkout-intents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sectionId: "ticket-section-regular-entry",
          phaseId: "ticket-phase-general",
          quantity: 1,
        }),
      }),
      { params: Promise.resolve({ id: "event-1" }) },
    );

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

  it("returns 400 on invalid request payloads before the service runs", async () => {
    const response = await checkoutIntentRoute(
      new Request("http://localhost/api/store/events/event-1/checkout-intents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sectionId: "ticket-section-regular-entry",
          quantity: 1,
        }),
      }),
      { params: Promise.resolve({ id: "event-1" }) },
    );

    expect(response.status).toBe(400);
    expect(checkoutServiceMocks.createCheckoutIntentService).not.toHaveBeenCalled();
  });

  it("returns the Stripe Checkout redirect contract for valid requests", async () => {
    checkoutServiceMocks.createCheckoutIntentService.mockResolvedValue({
      order: {
        id: "order-1",
      },
      checkout: {
        stripeCheckoutUrl: "https://checkout.stripe.test/session/cs_test_123",
        stripeCheckoutSessionId: "cs_test_123",
      },
    });

    const response = await checkoutIntentRoute(
      new Request("http://localhost/api/store/events/event-1/checkout-intents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sectionId: "ticket-section-regular-entry",
          phaseId: "ticket-phase-general",
          quantity: 2,
        }),
      }),
      { params: Promise.resolve({ id: "event-1" }) },
    );

    expect(response.status).toBe(201);
    expect(checkoutServiceMocks.createCheckoutIntentService).toHaveBeenCalledWith({
      eventId: "event-1",
      userId: "consumer-1",
      sectionId: "ticket-section-regular-entry",
      phaseId: "ticket-phase-general",
      quantity: 2,
      provider: "stripe",
    });
    await expect(response.json()).resolves.toEqual({
      checkoutUrl: "https://checkout.stripe.test/session/cs_test_123",
      orderId: "order-1",
      sessionId: "cs_test_123",
    });
  });

  it("rejects free or non-session checkout results from the Stripe checkout route", async () => {
    checkoutServiceMocks.createCheckoutIntentService.mockResolvedValue({
      order: {
        id: "order-2",
      },
      checkout: {
        stripeCheckoutUrl: undefined,
        stripeCheckoutSessionId: undefined,
      },
    });

    const response = await checkoutIntentRoute(
      new Request("http://localhost/api/store/events/event-1/checkout-intents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sectionId: "ticket-section-regular-entry",
          phaseId: "ticket-phase-general",
          quantity: 1,
        }),
      }),
      { params: Promise.resolve({ id: "event-1" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "CONFLICT",
        message: "Stripe Checkout is only available for paid ticket phases.",
      },
    });
  });
});
