import { NextResponse } from "next/server";
import { withRouteHandler, parseJsonBody } from "@/lib/http/route";
import { switchOrganizationSchema } from "@/lib/validation/workspace";
import { switchCurrentOrganizationService } from "@/lib/services/workspace-service";
import { CURRENT_ORGANIZATION_COOKIE } from "@/lib/workspace/constants";

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const payload = await parseJsonBody(request, switchOrganizationSchema);
    const nextWorkspace = await switchCurrentOrganizationService(payload.organizationId);

    const response = NextResponse.json({
      organization: nextWorkspace.organization,
      role: nextWorkspace.role,
    });

    response.cookies.set(CURRENT_ORGANIZATION_COOKIE, nextWorkspace.organization.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return response;
  });
}
