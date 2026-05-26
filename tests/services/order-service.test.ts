import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTicketOrderRepository: vi.fn(),
  getTicketOrderRepositoryById: vi.fn(),
  getTicketOrderRepositoryByStripeCheckoutSessionId: vi.fn(),
  getTicketOrderRepositoryByStripePaymentIntentId: vi.fn(),
  updateTicketOrderRepository: vi.fn(),
}));

vi.mock("@/lib/db/repositories/order-repository", () => ({
  createTicketOrderRepository: mocks.createTicketOrderRepository,
  getTicketOrderRepositoryById: mocks.getTicketOrderRepositoryById,
  getTicketOrderRepositoryByStripeCheckoutSessionId: mocks.getTicketOrderRepositoryByStripeCheckoutSessionId,
  getTicketOrderRepositoryByStripePaymentIntentId: mocks.getTicketOrderRepositoryByStripePaymentIntentId,
  updateTicketOrderRepository: mocks.updateTicketOrderRepository,
}));

import {
  createPendingTicketOrderService,
  getTicketOrderByStripeCheckoutSessionService,
  getTicketOrderByStripePaymentIntentService,
  getTicketOrderService,
  updateTicketOrderStatusService,
} from "@/lib/services/order-service";

describe("order service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTicketOrderRepository.mockImplementation(async (order) => ({
      id: "order-1",
      createdAt: "2026-04-25T00:00:00.000Z",
      updatedAt: "2026-04-25T00:00:00.000Z",
      stripeConnectedAccountId: undefined,
      stripeCheckoutSessionId: undefined,
      stripePaymentIntentId: undefined,
      ...order,
    }));
    mocks.getTicketOrderRepositoryById.mockResolvedValue({
      id: "order-1",
      eventId: "event-1",
      organizationId: "organization-1",
      consumerUserId: "consumer-1",
      status: "pending",
      currency: "EUR",
      subtotalAmount: 90,
      totalAmount: 90,
      stripeConnectedAccountId: undefined,
      createdAt: "2026-04-25T00:00:00.000Z",
      updatedAt: "2026-04-25T00:00:00.000Z",
      items: [],
    });
    mocks.updateTicketOrderRepository.mockImplementation(async (_id, update) => ({
      id: "order-1",
      eventId: "event-1",
      organizationId: "organization-1",
      consumerUserId: "consumer-1",
      status: update.status ?? "pending",
      currency: "EUR",
      subtotalAmount: 90,
      totalAmount: 90,
      stripeConnectedAccountId: update.stripeConnectedAccountId,
      stripeCheckoutSessionId: update.stripeCheckoutSessionId,
      stripePaymentIntentId: update.stripePaymentIntentId,
      createdAt: "2026-04-25T00:00:00.000Z",
      updatedAt: "2026-04-25T00:00:00.000Z",
      items: [],
    }));
  });

  it("creates a pending order and computes subtotal and total from items", async () => {
    const result = await createPendingTicketOrderService({
      eventId: "event-1",
      organizationId: "organization-1",
      consumerUserId: "consumer-1",
      currency: "eur",
      stripeConnectedAccountId: "acct_123",
      items: [
        {
          ticketSectionId: "section-1",
          ticketPhaseId: "phase-1",
          quantity: 2,
          unitPrice: 45,
        },
      ],
    });

    expect(mocks.createTicketOrderRepository).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        currency: "EUR",
        subtotalAmount: 90,
        totalAmount: 90,
        stripeConnectedAccountId: "acct_123",
        items: [
          expect.objectContaining({
            quantity: 2,
            unitPrice: 45,
            totalPrice: 90,
          }),
        ],
      }),
    );
    expect(result.status).toBe("pending");
  });

  it("rejects empty ticket order items", async () => {
    await expect(
      createPendingTicketOrderService({
        eventId: "event-1",
        organizationId: "organization-1",
        consumerUserId: "consumer-1",
        currency: "EUR",
        items: [],
      }),
    ).rejects.toMatchObject({
      name: "ZodError",
    });
  });

  it("can load orders by id and provider references", async () => {
    mocks.getTicketOrderRepositoryByStripeCheckoutSessionId.mockResolvedValue({ id: "order-1" });
    mocks.getTicketOrderRepositoryByStripePaymentIntentId.mockResolvedValue({ id: "order-1" });

    await expect(getTicketOrderService("order-1")).resolves.toMatchObject({ id: "order-1" });
    await expect(
      getTicketOrderByStripeCheckoutSessionService("cs_test_123"),
    ).resolves.toMatchObject({ id: "order-1" });
    await expect(
      getTicketOrderByStripePaymentIntentService("pi_test_123"),
    ).resolves.toMatchObject({ id: "order-1" });
  });

  it("updates order status and provider references", async () => {
    const result = await updateTicketOrderStatusService({
      orderId: "order-1",
      status: "checkout_started",
      stripeConnectedAccountId: "acct_123",
      stripeCheckoutSessionId: "cs_test_123",
    });

    expect(mocks.updateTicketOrderRepository).toHaveBeenCalledWith("order-1", {
      status: "checkout_started",
      stripeConnectedAccountId: "acct_123",
      stripeCheckoutSessionId: "cs_test_123",
      stripePaymentIntentId: undefined,
    });
    expect(result.status).toBe("checkout_started");
  });

  it("returns not found when updating an order that does not exist", async () => {
    mocks.getTicketOrderRepositoryById.mockResolvedValue(null);

    await expect(
      updateTicketOrderStatusService({
        orderId: "order-missing",
        status: "paid",
        stripePaymentIntentId: "pi_test_123",
      }),
    ).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });
});
