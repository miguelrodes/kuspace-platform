import { withRouteHandler, parseJsonBody } from "@/lib/http/route";
import { updateOrganizationSchema } from "@/lib/validation/workspace";
import {
  getCurrentOrganizationService,
  updateCurrentOrganizationService,
} from "@/lib/services/organization-service";

export async function GET() {
  return withRouteHandler(async () => {
    const current = await getCurrentOrganizationService();
    return current;
  });
}

export async function PATCH(request: Request) {
  return withRouteHandler(async () => {
    const payload = await parseJsonBody(request, updateOrganizationSchema);
    const organization = await updateCurrentOrganizationService(payload);
    return {
      organization,
    };
  });
}
