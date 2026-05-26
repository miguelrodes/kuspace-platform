import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { getOwnedEventEditorAggregateService } from "@/lib/services/event-editor-service";
import { deleteEventService, updateEventService } from "@/lib/services/event-service";
import { eventUpdateSchema, idParamsSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id } = await parseRouteParams(context.params, idParamsSchema);
    const event = await parseJsonBody(request, eventUpdateSchema);
    return updateEventService(id, event);
  });
}

export async function GET(_: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id } = await parseRouteParams(context.params, idParamsSchema);
    return getOwnedEventEditorAggregateService(id);
  });
}

export async function DELETE(_: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id } = await parseRouteParams(context.params, idParamsSchema);
    return deleteEventService(id);
  });
}
