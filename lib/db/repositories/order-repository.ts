import { Prisma } from "@prisma/client";
import { conflict, notFound } from "@/lib/http/errors";
import { getConsumerWalletStatusForPaymentState } from "@/lib/event-access";
import { prisma } from "@/lib/prisma";
import { getConsumerUserById, getEventById } from "@/lib/db/store-repository";
import type { EventTicketSalesSummaryRow } from "@/types/attendee";
import type { Event } from "@/types/event";
import type { TicketOrder } from "@/types/order";
import type { ConsumerUser } from "@/types/user";

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

function mapTicketOrderModel<T extends TicketOrderModel>(model: T): TicketOrder {
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

const ticketOrderFulfillmentInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      ticketSection: {
        select: {
          id: true,
          eventId: true,
          name: true,
          accessGroupId: true,
        },
      },
      ticketPhase: {
        select: {
          id: true,
          ticketSectionId: true,
          quantityAvailable: true,
          quantitySold: true,
          status: true,
        },
      },
    },
  },
  event: {
    select: {
      id: true,
      slug: true,
      status: true,
    },
  },
} satisfies Prisma.TicketOrderInclude;

type TicketOrderFulfillmentModel = Prisma.TicketOrderGetPayload<{
  include: typeof ticketOrderFulfillmentInclude;
}>;

type TicketOrderFulfillmentResult =
  | {
      order: TicketOrder;
      fulfilled: false;
    }
  | {
      order: TicketOrder;
      fulfilled: true;
      event: Event;
      user: ConsumerUser;
    };

const MAX_PAID_FULFILLMENT_RETRIES = 3;

function getOrderPaymentState(order: Pick<TicketOrder, "totalAmount">) {
  return order.totalAmount > 0 ? "paid" : "not_required";
}

function buildWalletEntryId(params: {
  consumerUserId: string;
  eventSlug: string;
  accessGroupId: string;
  ticketLabel?: string | null;
}) {
  return [
    "wallet",
    params.consumerUserId,
    params.eventSlug,
    params.accessGroupId,
    encodeURIComponent(params.ticketLabel ?? ""),
  ].join(":");
}

function buildGuestlistEntryId(eventId: string, consumerUserId: string) {
  return `${eventId}-ticket-${consumerUserId}`;
}

function isRetryableTransactionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

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

export async function listTicketOrdersRepositoryByEventId(
  eventId: string,
  options?: {
    status?: TicketOrder["status"];
  },
) {
  const orders = await prisma.ticketOrder.findMany({
    where: {
      eventId,
      ...(options?.status ? { status: options.status } : {}),
    },
    include: ticketOrderInclude,
    orderBy: [
      { updatedAt: "desc" },
      { createdAt: "desc" },
    ],
  });

  return orders.map((order) => mapTicketOrderModel(order as TicketOrderModel));
}

export async function listPaidTicketSalesSummaryRepositoryByEventId(
  eventId: string,
): Promise<EventTicketSalesSummaryRow[]> {
  const items = await prisma.ticketOrderItem.findMany({
    where: {
      order: {
        eventId,
        status: "paid",
      },
    },
    include: {
      ticketSection: {
        select: {
          id: true,
          name: true,
          sortOrder: true,
        },
      },
      ticketPhase: {
        select: {
          id: true,
          name: true,
          sortOrder: true,
          quantityAvailable: true,
          quantitySold: true,
        },
      },
    },
    orderBy: [
      { ticketSection: { sortOrder: "asc" } },
      { ticketPhase: { sortOrder: "asc" } },
      { createdAt: "asc" },
    ],
  });

  const summaryByKey = new Map<string, EventTicketSalesSummaryRow>();

  for (const item of items) {
    const summaryKey = `${item.ticketSectionId}:${item.ticketPhaseId}`;
    const existingSummary = summaryByKey.get(summaryKey);

    summaryByKey.set(summaryKey, {
      ticketSectionId: item.ticketSectionId,
      ticketSectionName: item.ticketSection.name,
      ticketPhaseId: item.ticketPhaseId,
      ticketPhaseName: item.ticketPhase.name,
      ticketsSold: (existingSummary?.ticketsSold ?? 0) + item.quantity,
      remainingInventory: Math.max(
        item.ticketPhase.quantityAvailable - (item.ticketPhase.quantitySold ?? 0),
        0,
      ),
      grossRevenue:
        (existingSummary?.grossRevenue ?? 0) + item.totalPrice.toNumber(),
    });
  }

  return [...summaryByKey.values()];
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

async function fulfillPaidTicketOrderTransaction(params: {
  orderId: string;
  occurredAt: string;
  stripeConnectedAccountId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
}): Promise<
  | {
      order: TicketOrder;
      fulfilled: false;
    }
  | {
      order: TicketOrder;
      fulfilled: true;
      eventId: string;
      consumerUserId: string;
    }
> {
  return prisma.$transaction(async (tx) => {
    const existingOrder = await tx.ticketOrder.findUnique({
      where: { id: params.orderId },
      include: ticketOrderFulfillmentInclude,
    });

    if (!existingOrder) {
      throw notFound("Ticket order not found");
    }

    if (existingOrder.status === "paid") {
      return {
        order: mapTicketOrderModel(existingOrder as unknown as TicketOrderModel),
        fulfilled: false,
      };
    }

    if (existingOrder.status !== "pending" && existingOrder.status !== "checkout_started") {
      throw conflict("Ticket order cannot transition to paid from its current state.");
    }

    const transitionToPaid = await tx.ticketOrder.updateMany({
      where: {
        id: existingOrder.id,
        status: existingOrder.status,
      },
      data: {
        status: "paid",
        stripeConnectedAccountId:
          params.stripeConnectedAccountId ?? existingOrder.stripeConnectedAccountId,
        stripeCheckoutSessionId:
          params.stripeCheckoutSessionId ?? existingOrder.stripeCheckoutSessionId,
        stripePaymentIntentId:
          params.stripePaymentIntentId ?? existingOrder.stripePaymentIntentId,
      },
    });

    if (transitionToPaid.count === 0) {
      const currentOrder = await tx.ticketOrder.findUnique({
        where: { id: existingOrder.id },
        include: ticketOrderFulfillmentInclude,
      });

      if (!currentOrder) {
        throw notFound("Ticket order not found");
      }

      if (currentOrder.status === "paid") {
        return {
          order: mapTicketOrderModel(currentOrder as unknown as TicketOrderModel),
          fulfilled: false,
        };
      }

      throw conflict("Ticket order payment is already being processed.");
    }

    const paidOrder = await tx.ticketOrder.findUnique({
      where: { id: existingOrder.id },
      include: ticketOrderFulfillmentInclude,
    });

    if (!paidOrder) {
      throw notFound("Ticket order not found");
    }

    const paymentState = getOrderPaymentState(
      mapTicketOrderModel(paidOrder as unknown as TicketOrderModel),
    );
    const walletStatus = getConsumerWalletStatusForPaymentState(paymentState);
    const occurredAt = new Date(params.occurredAt);

    const phaseQuantities = new Map<
      string,
      Pick<TicketOrderFulfillmentModel["items"][number]["ticketPhase"], "id" | "quantityAvailable" | "quantitySold" | "status"> & {
        requiredQuantity: number;
      }
    >();

    for (const item of paidOrder.items) {
      if (item.ticketSection.eventId !== paidOrder.eventId) {
        throw conflict("Ticket order item does not belong to the expected event.");
      }

      if (item.ticketPhase.ticketSectionId !== item.ticketSectionId) {
        throw conflict("Ticket order item phase does not belong to the expected ticket section.");
      }

      const existingPhase = phaseQuantities.get(item.ticketPhaseId);

      if (existingPhase) {
        existingPhase.requiredQuantity += item.quantity;
        continue;
      }

      phaseQuantities.set(item.ticketPhaseId, {
        id: item.ticketPhase.id,
        quantityAvailable: item.ticketPhase.quantityAvailable,
        quantitySold: item.ticketPhase.quantitySold,
        status: item.ticketPhase.status,
        requiredQuantity: item.quantity,
      });
    }

    for (const phase of phaseQuantities.values()) {
      const nextQuantitySold = phase.quantitySold + phase.requiredQuantity;

      if (nextQuantitySold > phase.quantityAvailable) {
        throw conflict("Confirmed payment would exceed the available ticket inventory.");
      }

      const updatedPhase = await tx.ticketTier.updateMany({
        where: {
          id: phase.id,
          quantitySold: phase.quantitySold,
        },
        data: {
          quantitySold: {
            increment: phase.requiredQuantity,
          },
          status: nextQuantitySold >= phase.quantityAvailable ? "sold_out" : phase.status,
        },
      });

      if (updatedPhase.count === 0) {
        throw conflict("Confirmed payment would exceed the available ticket inventory.");
      }
    }

    for (const item of paidOrder.items) {
      await tx.eventAccessAssignment.upsert({
        where: {
          eventId_consumerUserId: {
            eventId: paidOrder.eventId,
            consumerUserId: paidOrder.consumerUserId,
          },
        },
        create: {
          eventId: paidOrder.eventId,
          consumerUserId: paidOrder.consumerUserId,
          accessGroupId: item.ticketSection.accessGroupId,
          source: "purchase",
          paymentState,
          checkedIn: false,
          assignedAt: occurredAt,
        },
        update: {
          accessGroupId: item.ticketSection.accessGroupId,
          source: "purchase",
          paymentState,
        },
      });

      await tx.guestlistEntry.upsert({
        where: {
          id: buildGuestlistEntryId(paidOrder.eventId, paidOrder.consumerUserId),
        },
        create: {
          id: buildGuestlistEntryId(paidOrder.eventId, paidOrder.consumerUserId),
          eventId: paidOrder.eventId,
          source: "user",
          accessGroupId: item.ticketSection.accessGroupId,
          consumerUserId: paidOrder.consumerUserId,
          checkedIn: false,
          createdAt: occurredAt,
        },
        update: {
          accessGroupId: item.ticketSection.accessGroupId,
          consumerUserId: paidOrder.consumerUserId,
        },
      });
    }

    const walletEntries = new Map<
      string,
      {
        accessGroupId: string;
        eventSlug: string;
        quantity: number;
        ticketLabel: string;
      }
    >();

    for (const item of paidOrder.items) {
      const walletKey = [
        paidOrder.consumerUserId,
        paidOrder.event.slug,
        item.ticketSection.accessGroupId,
        item.ticketSection.name,
      ].join(":");
      const existingEntry = walletEntries.get(walletKey);

      if (existingEntry) {
        existingEntry.quantity += item.quantity;
        continue;
      }

      walletEntries.set(walletKey, {
        accessGroupId: item.ticketSection.accessGroupId,
        eventSlug: paidOrder.event.slug,
        quantity: item.quantity,
        ticketLabel: item.ticketSection.name,
      });
    }

    for (const entry of walletEntries.values()) {
      const existingWalletEntry = await tx.consumerTicketWalletEntry.findFirst({
        where: {
          consumerUserId: paidOrder.consumerUserId,
          eventSlug: entry.eventSlug,
          accessGroupId: entry.accessGroupId,
          ticketLabel: entry.ticketLabel,
        },
      });

      if (existingWalletEntry) {
        await tx.consumerTicketWalletEntry.update({
          where: { id: existingWalletEntry.id },
          data: {
            quantity: {
              increment: entry.quantity,
            },
            status: walletStatus,
            ticketLabel: entry.ticketLabel,
          },
        });
        continue;
      }

      await tx.consumerTicketWalletEntry.upsert({
        where: {
          id: buildWalletEntryId({
            consumerUserId: paidOrder.consumerUserId,
            eventSlug: entry.eventSlug,
            accessGroupId: entry.accessGroupId,
            ticketLabel: entry.ticketLabel,
          }),
        },
        create: {
          id: buildWalletEntryId({
            consumerUserId: paidOrder.consumerUserId,
            eventSlug: entry.eventSlug,
            accessGroupId: entry.accessGroupId,
            ticketLabel: entry.ticketLabel,
          }),
          consumerUserId: paidOrder.consumerUserId,
          eventSlug: entry.eventSlug,
          accessGroupId: entry.accessGroupId,
          quantity: entry.quantity,
          ticketLabel: entry.ticketLabel,
          status: walletStatus,
        },
        update: {
          quantity: {
            increment: entry.quantity,
          },
          ticketLabel: entry.ticketLabel,
          status: walletStatus,
        },
      });
    }

    if (paidOrder.event.status === "past") {
      await tx.consumerUserUpcomingTicketEvent.deleteMany({
        where: {
          consumerUserId: paidOrder.consumerUserId,
          eventSlug: paidOrder.event.slug,
        },
      });

      await tx.consumerUserPastTicketEvent.upsert({
        where: {
          consumerUserId_eventSlug: {
            consumerUserId: paidOrder.consumerUserId,
            eventSlug: paidOrder.event.slug,
          },
        },
        create: {
          consumerUserId: paidOrder.consumerUserId,
          eventSlug: paidOrder.event.slug,
        },
        update: {},
      });
    } else {
      await tx.consumerUserPastTicketEvent.deleteMany({
        where: {
          consumerUserId: paidOrder.consumerUserId,
          eventSlug: paidOrder.event.slug,
        },
      });

      await tx.consumerUserUpcomingTicketEvent.upsert({
        where: {
          consumerUserId_eventSlug: {
            consumerUserId: paidOrder.consumerUserId,
            eventSlug: paidOrder.event.slug,
          },
        },
        create: {
          consumerUserId: paidOrder.consumerUserId,
          eventSlug: paidOrder.event.slug,
        },
        update: {},
      });
    }

    return {
      order: mapTicketOrderModel(paidOrder as unknown as TicketOrderModel),
      fulfilled: true,
      eventId: paidOrder.eventId,
      consumerUserId: paidOrder.consumerUserId,
    };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function fulfillPaidTicketOrderRepository(params: {
  orderId: string;
  occurredAt: string;
  stripeConnectedAccountId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
}): Promise<TicketOrderFulfillmentResult> {
  for (let attempt = 1; attempt <= MAX_PAID_FULFILLMENT_RETRIES; attempt += 1) {
    try {
      const result = await fulfillPaidTicketOrderTransaction(params);

      if (!result.fulfilled) {
        return result;
      }

      const [event, user, order] = await Promise.all([
        getEventById(result.eventId),
        getConsumerUserById(result.consumerUserId),
        getTicketOrderRepositoryById(result.order.id),
      ]);

      if (!event) {
        throw notFound("Event not found");
      }

      if (!user) {
        throw notFound("Consumer user not found");
      }

      return {
        order: order ?? result.order,
        fulfilled: true,
        event,
        user,
      };
    } catch (error) {
      if (isRetryableTransactionError(error) && attempt < MAX_PAID_FULFILLMENT_RETRIES) {
        continue;
      }

      throw error;
    }
  }

  throw conflict("Ticket order payment is already being processed.");
}
