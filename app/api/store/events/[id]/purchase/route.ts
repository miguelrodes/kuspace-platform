import { NextResponse } from "next/server";
import { getEventById, getStoreUserById, saveConsumerUser, saveEventAggregate } from "@/lib/db/store-repository";
import { syncTicketPurchaseToEvent, syncTicketPurchaseToUser } from "@/lib/event-access";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { userId, sectionId, quantity = 1 } = (await request.json()) as {
    userId: string;
    sectionId: string;
    quantity?: number;
  };

  const [event, user] = await Promise.all([getEventById(id), getStoreUserById(userId)]);

  if (!event || !user) {
    return NextResponse.json(null, { status: 404 });
  }

  const section = (event.tickets.sections ?? []).find((candidate) => candidate.id === sectionId);
  if (!section) {
    return NextResponse.json(null, { status: 404 });
  }

  const purchasedAt = new Date().toISOString();
  const nextEvent = syncTicketPurchaseToEvent(event, {
    userId,
    accessGroupId: section.accessGroupId,
    purchasedAt,
  });
  const nextUser = syncTicketPurchaseToUser(user, {
    eventSlug: event.slug,
    quantity,
    accessGroupId: section.accessGroupId,
    ticketLabel: section.name,
    status: "active",
  });

  const [savedEvent, savedUser] = await Promise.all([
    saveEventAggregate(nextEvent),
    saveConsumerUser(nextUser),
  ]);

  return NextResponse.json({
    event: savedEvent,
    user: savedUser,
  });
}
