import { NextResponse } from "next/server";
import { approveCuratedApplication } from "@/lib/event-access";
import { getEventById, saveEventAggregate } from "@/lib/db/store-repository";

type RouteContext = {
  params: Promise<{
    id: string;
    userId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id, userId } = await context.params;
  const { accessGroupId } = (await request.json()) as { accessGroupId: string };
  const event = await getEventById(id);

  if (!event) {
    return NextResponse.json(null, { status: 404 });
  }

  const nextEvent = approveCuratedApplication(event, { userId, accessGroupId });
  const savedEvent = await saveEventAggregate(nextEvent);
  return NextResponse.json(savedEvent);
}
