import { NextResponse } from "next/server";
import { withRouteHandler } from "@/lib/http/route";
import { createOrganizationFormSchema } from "@/lib/validation/workspace";
import { createOrganizationService } from "@/lib/services/organization-service";
import { listMyOrganizationsService } from "@/lib/services/workspace-service";
import { CURRENT_ORGANIZATION_COOKIE } from "@/lib/workspace/constants";

export async function GET() {
  return withRouteHandler(async () => {
    const organizations = await listMyOrganizationsService();
    return {
      organizations,
    };
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const formData = await request.formData();
    const payload = createOrganizationFormSchema.parse({
      name: formData.get("name")?.toString(),
      slug: formData.get("slug")?.toString(),
      type: formData.get("type")?.toString(),
      locationDisplayText: formData.get("locationDisplayText")?.toString() || undefined,
    });
    const result = await createOrganizationService(payload);

    const response = NextResponse.redirect(new URL(result.destination, request.url), {
      status: 303,
    });
    response.cookies.set(CURRENT_ORGANIZATION_COOKIE, result.organization.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  });
}
