import { notFound } from "@/lib/http/errors";
import {
  createTicketOrderSchema,
  updateTicketOrderStatusSchema,
  type CreateTicketOrderInput,
  type UpdateTicketOrderStatusInput,
} from "@/lib/validation/order";
import {
  createTicketOrderRepository,
  getTicketOrderRepositoryById,
  getTicketOrderRepositoryByStripeCheckoutSessionId,
  getTicketOrderRepositoryByStripePaymentIntentId,
  updateTicketOrderRepository,
} from "@/lib/db/repositories/order-repository";

function sumOrderAmounts(items: CreateTicketOrderInput["items"]) {
  const subtotalAmount = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  return {
    subtotalAmount,
    totalAmount: subtotalAmount,
  };
}

export async function createPendingTicketOrderService(input: CreateTicketOrderInput) {
  const payload = createTicketOrderSchema.parse(input);
  const amounts = sumOrderAmounts(payload.items);

  return createTicketOrderRepository({
    eventId: payload.eventId,
    organizationId: payload.organizationId,
    consumerUserId: payload.consumerUserId,
    status: "pending",
    currency: payload.currency,
    subtotalAmount: amounts.subtotalAmount,
    totalAmount: amounts.totalAmount,
    stripeConnectedAccountId: payload.stripeConnectedAccountId,
    items: payload.items.map((item) => ({
      ...item,
      totalPrice: item.unitPrice * item.quantity,
    })),
  });
}

export async function getTicketOrderService(orderId: string) {
  return getTicketOrderRepositoryById(orderId);
}

export async function getTicketOrderByStripeCheckoutSessionService(stripeCheckoutSessionId: string) {
  return getTicketOrderRepositoryByStripeCheckoutSessionId(stripeCheckoutSessionId);
}

export async function getTicketOrderByStripePaymentIntentService(stripePaymentIntentId: string) {
  return getTicketOrderRepositoryByStripePaymentIntentId(stripePaymentIntentId);
}

export async function updateTicketOrderStatusService(input: UpdateTicketOrderStatusInput) {
  const payload = updateTicketOrderStatusSchema.parse(input);
  const existingOrder = await getTicketOrderRepositoryById(payload.orderId);

  if (!existingOrder) {
    throw notFound("Ticket order not found");
  }

  return updateTicketOrderRepository(payload.orderId, {
    status: payload.status,
    stripeConnectedAccountId: payload.stripeConnectedAccountId,
    stripeCheckoutSessionId: payload.stripeCheckoutSessionId,
    stripePaymentIntentId: payload.stripePaymentIntentId,
  });
}
