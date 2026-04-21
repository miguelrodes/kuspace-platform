import { NextResponse } from "next/server";
import { getEventById, saveEventAggregate } from "@/lib/db/store-repository";
import { applyToCuratedEvent } from "@/lib/event-access";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { userId } = (await request.json()) as { userId: string };
  const event = await getEventById(id);

  if (!event) {
    return NextResponse.json(null, { status: 404 });
  }

  const nextEvent = applyToCuratedEvent(event, userId);
  const savedEvent = await saveEventAggregate(nextEvent);
  return NextResponse.json(savedEvent);
}
