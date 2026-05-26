import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { transitionEventStatusService } from "@/lib/services/event-service";
import { eventStatusTransitionSchema, idParamsSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id } = await parseRouteParams(context.params, idParamsSchema);
    const { status } = await parseJsonBody(request, eventStatusTransitionSchema);
    return transitionEventStatusService(id, status);
  });
}
