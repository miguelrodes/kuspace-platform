import { NextResponse } from "next/server";
import { withRouteHandler } from "@/lib/http/route";
import { authActorRoleSchema } from "@/lib/validation/auth-actor";
import { selectCurrentAppActorService } from "@/lib/services/auth-actor-service";

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const formData = await request.formData();
    const payload = authActorRoleSchema.parse({
      role: formData.get("role"),
    });
    const result = await selectCurrentAppActorService(payload.role);

    return NextResponse.redirect(new URL(result.destination, request.url), {
      status: 303,
    });
  });
}
