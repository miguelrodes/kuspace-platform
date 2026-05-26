import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { approveCuratedApplicationService } from "@/lib/services/application-service";
import { approveCuratedApplicationSchema, idAndUserIdParamsSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
    userId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, userId } = await parseRouteParams(context.params, idAndUserIdParamsSchema);
    const body = await parseJsonBody(request, approveCuratedApplicationSchema);
    return approveCuratedApplicationService({
      eventId: id,
      userId,
      accessGroupId: body.accessGroupId,
    });
  });
}
