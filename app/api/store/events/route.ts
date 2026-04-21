import { NextResponse } from "next/server";
import type { Event } from "@/types/event";
import { saveEventAggregate } from "@/lib/db/store-repository";

export async function POST(request: Request) {
  const event = (await request.json()) as Event;
  const savedEvent = await saveEventAggregate(event);
  return NextResponse.json(savedEvent);
}
