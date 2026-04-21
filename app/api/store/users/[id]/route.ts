import { NextResponse } from "next/server";
import type { ConsumerUser } from "@/types/user";
import { saveConsumerUser } from "@/lib/db/store-repository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = (await request.json()) as ConsumerUser;
  const savedUser = await saveConsumerUser({ ...user, id });
  return NextResponse.json(savedUser);
}
