import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { applyToCuratedEventService } from "@/lib/services/application-service";
import { applyToCuratedEventSchema, idParamsSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id } = await parseRouteParams(context.params, idParamsSchema);
    const body = await parseJsonBody(request, applyToCuratedEventSchema);
    return applyToCuratedEventService({ eventId: id, userId: body.userId });
  }, { successStatus: 201 });
}
