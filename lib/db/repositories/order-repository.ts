import { prisma } from "@/lib/prisma";
import type { TicketOrder } from "@/types/order";

type TicketOrderItemModel = {
  id: string;
  orderId: string;
  ticketSectionId: string;
  ticketPhaseId: string;
  quantity: number;
  unitPrice: { toNumber(): number };
  totalPrice: { toNumber(): number };
  createdAt: Date;
};

type TicketOrderModel = {
  id: string;
  eventId: string;
  organizationId: string;
  consumerUserId: string;
  status: string;
  currency: string;
  subtotalAmount: { toNumber(): number };
  totalAmount: { toNumber(): number };
  stripeConnectedAccountId: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: TicketOrderItemModel[];
};

function mapTicketOrderModel(model: TicketOrderModel): TicketOrder {
  return {
    id: model.id,
    eventId: model.eventId,
    organizationId: model.organizationId,
    consumerUserId: model.consumerUserId,
    status: model.status as TicketOrder["status"],
    currency: model.currency,
    subtotalAmount: model.subtotalAmount.toNumber(),
    totalAmount: model.totalAmount.toNumber(),
    stripeConnectedAccountId: model.stripeConnectedAccountId ?? undefined,
    stripeCheckoutSessionId: model.stripeCheckoutSessionId ?? undefined,
    stripePaymentIntentId: model.stripePaymentIntentId ?? undefined,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
    items: model.items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      ticketSectionId: item.ticketSectionId,
      ticketPhaseId: item.ticketPhaseId,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toNumber(),
      totalPrice: item.totalPrice.toNumber(),
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

const ticketOrderInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
  },
};

export async function createTicketOrderRepository(input: {
  eventId: string;
  organizationId: string;
  consumerUserId: string;
  status: TicketOrder["status"];
  currency: string;
  subtotalAmount: number;
  totalAmount: number;
  stripeConnectedAccountId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  items: Array<{
    ticketSectionId: string;
    ticketPhaseId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}) {
  const order = await prisma.ticketOrder.create({
    data: {
      eventId: input.eventId,
      organizationId: input.organizationId,
      consumerUserId: input.consumerUserId,
      status: input.status,
      currency: input.currency,
      subtotalAmount: input.subtotalAmount,
      totalAmount: input.totalAmount,
      stripeConnectedAccountId: input.stripeConnectedAccountId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      items: {
        create: input.items,
      },
    },
    include: ticketOrderInclude,
  });

  return mapTicketOrderModel(order as TicketOrderModel);
}

export async function getTicketOrderRepositoryById(id: string) {
  const order = await prisma.ticketOrder.findUnique({
    where: { id },
    include: ticketOrderInclude,
  });

  return order ? mapTicketOrderModel(order as TicketOrderModel) : null;
}

export async function getTicketOrderRepositoryByStripeCheckoutSessionId(stripeCheckoutSessionId: string) {
  const order = await prisma.ticketOrder.findUnique({
    where: { stripeCheckoutSessionId },
    include: ticketOrderInclude,
  });

  return order ? mapTicketOrderModel(order as TicketOrderModel) : null;
}

export async function getTicketOrderRepositoryByStripePaymentIntentId(stripePaymentIntentId: string) {
  const order = await prisma.ticketOrder.findUnique({
    where: { stripePaymentIntentId },
    include: ticketOrderInclude,
  });

  return order ? mapTicketOrderModel(order as TicketOrderModel) : null;
}

export async function updateTicketOrderRepository(
  id: string,
  input: Partial<Pick<
    TicketOrder,
    | "status"
    | "currency"
    | "subtotalAmount"
    | "totalAmount"
    | "stripeConnectedAccountId"
    | "stripeCheckoutSessionId"
    | "stripePaymentIntentId"
  >>,
) {
  const order = await prisma.ticketOrder.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      ...(typeof input.subtotalAmount === "number" ? { subtotalAmount: input.subtotalAmount } : {}),
      ...(typeof input.totalAmount === "number" ? { totalAmount: input.totalAmount } : {}),
      ...(typeof input.stripeConnectedAccountId !== "undefined"
        ? { stripeConnectedAccountId: input.stripeConnectedAccountId }
        : {}),
      ...(typeof input.stripeCheckoutSessionId !== "undefined"
        ? { stripeCheckoutSessionId: input.stripeCheckoutSessionId }
        : {}),
      ...(typeof input.stripePaymentIntentId !== "undefined"
        ? { stripePaymentIntentId: input.stripePaymentIntentId }
        : {}),
    },
    include: ticketOrderInclude,
  });

  return mapTicketOrderModel(order as TicketOrderModel);
}
