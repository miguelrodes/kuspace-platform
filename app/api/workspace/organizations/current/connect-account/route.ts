import { parseJsonBody, withRouteHandler } from "@/lib/http/route";
import { createOrganizationStripeAccountSchema } from "@/lib/validation/workspace";
import { createCurrentOrganizationStripeAccountService } from "@/lib/services/organization-service";

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const contentType = request.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await parseJsonBody(request, createOrganizationStripeAccountSchema)
      : {};

    return createCurrentOrganizationStripeAccountService(payload);
  });
}
