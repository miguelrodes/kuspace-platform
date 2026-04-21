import { NextResponse } from "next/server";
import { denyCuratedApplication } from "@/lib/event-access";
import { getEventById, saveEventAggregate } from "@/lib/db/store-repository";

type RouteContext = {
  params: Promise<{
    id: string;
    userId: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { id, userId } = await context.params;
  const event = await getEventById(id);

  if (!event) {
    return NextResponse.json(null, { status: 404 });
  }

  const nextEvent = denyCuratedApplication(event, { userId });
  const savedEvent = await saveEventAggregate(nextEvent);
  return NextResponse.json(savedEvent);
}
