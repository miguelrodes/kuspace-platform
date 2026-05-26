import { beforeEach, describe, expect, it, vi } from "vitest";
import { unauthorized } from "@/lib/http/errors";
import { buildDraftEvent } from "@/tests/helpers/fixtures";

const eventServiceMocks = vi.hoisted(() => ({
  createEventService: vi.fn(),
  transitionEventStatusService: vi.fn(),
  updateEventService: vi.fn(),
  deleteEventService: vi.fn(),
}));

const checkoutServiceMocks = vi.hoisted(() => ({
  getTicketCheckoutStatusService: vi.fn(),
  verifyAndHandleStripeWebhookEventService: vi.fn(),
}));

vi.mock("@/lib/services/event-service", () => ({
  createEventService: eventServiceMocks.createEventService,
  transitionEventStatusService: eventServiceMocks.transitionEventStatusService,
  updateEventService: eventServiceMocks.updateEventService,
  deleteEventService: eventServiceMocks.deleteEventService,
}));

vi.mock("@/lib/services/checkout-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/checkout-service")>(
    "@/lib/services/checkout-service",
  );

  return {
    ...actual,
    getTicketCheckoutStatusService: checkoutServiceMocks.getTicketCheckoutStatusService,
    verifyAndHandleStripeWebhookEventService:
      checkoutServiceMocks.verifyAndHandleStripeWebhookEventService,
  };
});

import { POST as createEventRoute } from "@/app/api/store/events/route";
import { PUT as statusRoute } from "@/app/api/store/events/[id]/status/route";
import { DELETE as deleteEventRoute } from "@/app/api/store/events/[id]/route";
import { GET as checkoutStatusRoute } from "@/app/api/store/payments/checkout-status/route";
import { POST as stripeWebhookRoute } from "@/app/api/store/payments/webhooks/stripe/route";

describe("store route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 with a stable error shape when auth enforcement fails", async () => {
    eventServiceMocks.transitionEventStatusService.mockRejectedValue(unauthorized());

    const response = await statusRoute(
      new Request("http://localhost/api/store/events/event-1/status", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "upcoming" }),
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

  it("returns 400 on validation failures before the service runs", async () => {
    const response = await statusRoute(
      new Request("http://localhost/api/store/events/event-1/status", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "banana" }),
      }),
      { params: Promise.resolve({ id: "event-1" }) },
    );

    expect(response.status).toBe(400);
    expect(eventServiceMocks.transitionEventStatusService).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        status: 400,
      },
    });
  });

  it("returns happy-path CRUD responses with the correct status codes", async () => {
    const event = buildDraftEvent();
    eventServiceMocks.createEventService.mockResolvedValue(event);
    eventServiceMocks.transitionEventStatusService.mockResolvedValue({ ...event, status: "upcoming" });
    eventServiceMocks.deleteEventService.mockResolvedValue({ ok: true });

    const createResponse = await createEventRoute(
      new Request("http://localhost/api/store/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: event.slug }),
      }),
    );
    expect(createResponse.status).toBe(201);

    const statusResponse = await statusRoute(
      new Request("http://localhost/api/store/events/event-1/status", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "upcoming" }),
      }),
      { params: Promise.resolve({ id: event.id }) },
    );
    expect(statusResponse.status).toBe(200);

    const deleteResponse = await deleteEventRoute(
      new Request("http://localhost/api/store/events/event-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: event.id }) },
    );
    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toEqual({ ok: true });
  });

  it("returns 400 on invalid checkout-status lookups before the service runs", async () => {
    const response = await checkoutStatusRoute(
      new Request("http://localhost/api/store/payments/checkout-status"),
    );

    expect(response.status).toBe(400);
    expect(checkoutServiceMocks.getTicketCheckoutStatusService).not.toHaveBeenCalled();
  });

  it("returns checkout status for valid checkout-status lookups", async () => {
    checkoutServiceMocks.getTicketCheckoutStatusService.mockResolvedValue({
      order: {
        id: "order-1",
        eventId: "event-1",
        organizationId: "organization-1",
        consumerUserId: "consumer-1",
        status: "checkout_started",
        currency: "EUR",
        subtotalAmount: 45,
        totalAmount: 45,
        stripeConnectedAccountId: "acct_123",
        stripeCheckoutSessionId: "cs_test_123",
        stripePaymentIntentId: "pi_test_123",
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-26T00:00:00.000Z",
        items: [],
      },
      checkout: {
        state: "processing",
        stripeConnectedAccountId: "acct_123",
        stripeCheckoutSessionId: "cs_test_123",
        stripePaymentIntentId: "pi_test_123",
        stripeSessionStatus: "complete",
        stripePaymentStatus: "paid",
      },
    });

    const response = await checkoutStatusRoute(
      new Request(
        "http://localhost/api/store/payments/checkout-status?orderId=order-1&session_id=cs_test_123",
      ),
    );

    expect(response.status).toBe(200);
    expect(checkoutServiceMocks.getTicketCheckoutStatusService).toHaveBeenCalledWith({
      orderId: "order-1",
      stripeCheckoutSessionId: "cs_test_123",
    });
  });

  it("returns 400 when the Stripe webhook signature header is missing", async () => {
    const response = await stripeWebhookRoute(
      new Request("http://localhost/api/store/payments/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ id: "evt_123" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(checkoutServiceMocks.verifyAndHandleStripeWebhookEventService).not.toHaveBeenCalled();
  });

  it("passes the raw webhook payload and signature to Stripe verification", async () => {
    checkoutServiceMocks.verifyAndHandleStripeWebhookEventService.mockResolvedValue({
      received: true,
      eventType: "checkout.session.completed",
      handled: true,
    });

    const payload = JSON.stringify({ id: "evt_123", type: "checkout.session.completed" });
    const response = await stripeWebhookRoute(
      new Request("http://localhost/api/store/payments/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "t=1,v1=test",
          "content-type": "application/json",
        },
        body: payload,
      }),
    );

    expect(response.status).toBe(200);
    expect(checkoutServiceMocks.verifyAndHandleStripeWebhookEventService).toHaveBeenCalledWith(
      payload,
      "t=1,v1=test",
    );
  });
});
