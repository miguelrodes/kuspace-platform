import { parseOptionalJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { denyCuratedApplicationService } from "@/lib/services/application-service";
import { denyCuratedApplicationSchema, idAndUserIdParamsSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
    userId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, userId } = await parseRouteParams(context.params, idAndUserIdParamsSchema);
    await parseOptionalJsonBody(request, denyCuratedApplicationSchema);
    return denyCuratedApplicationService({ eventId: id, userId });
  });
}
