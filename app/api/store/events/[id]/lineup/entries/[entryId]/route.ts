import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import {
  deleteEventLineupEntryService,
  updateEventLineupEntryService,
} from "@/lib/services/event-editor-service";
import { idAndEntryIdParamsSchema, lineupEntryMutationSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
    entryId: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, entryId } = await parseRouteParams(context.params, idAndEntryIdParamsSchema);
    const payload = await parseJsonBody(request, lineupEntryMutationSchema);
    return updateEventLineupEntryService(id, entryId, payload);
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, entryId } = await parseRouteParams(context.params, idAndEntryIdParamsSchema);
    return deleteEventLineupEntryService(id, entryId);
  });
}
