import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import {
  deleteEventTimetableRowService,
  updateEventTimetableRowService,
} from "@/lib/services/event-editor-service";
import { idAndRowIdParamsSchema, timetableRowMutationSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
    rowId: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, rowId } = await parseRouteParams(context.params, idAndRowIdParamsSchema);
    const payload = await parseJsonBody(request, timetableRowMutationSchema);
    return updateEventTimetableRowService(id, rowId, payload);
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, rowId } = await parseRouteParams(context.params, idAndRowIdParamsSchema);
    return deleteEventTimetableRowService(id, rowId);
  });
}
