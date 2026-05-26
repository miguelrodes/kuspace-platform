import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { updateEventGuestlistService } from "@/lib/services/event-editor-service";
import { guestlistMutationSchema, idParamsSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id } = await parseRouteParams(context.params, idParamsSchema);
    const payload = await parseJsonBody(request, guestlistMutationSchema);
    return updateEventGuestlistService(id, payload);
  });
}
