import { NextResponse } from "next/server";
import type { Event } from "@/types/event";
import { deleteEventAggregate, saveEventAggregate } from "@/lib/db/store-repository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const event = (await request.json()) as Event;
  const savedEvent = await saveEventAggregate({ ...event, id });
  return NextResponse.json(savedEvent);
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  await deleteEventAggregate(id);
  return NextResponse.json({ ok: true });
}
