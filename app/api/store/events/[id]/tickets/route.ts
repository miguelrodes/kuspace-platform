import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { updateEventTicketsService } from "@/lib/services/event-editor-service";
import { idParamsSchema, ticketsUpdateSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id } = await parseRouteParams(context.params, idParamsSchema);
    const payload = await parseJsonBody(request, ticketsUpdateSchema);
    return updateEventTicketsService(id, payload);
  });
}
