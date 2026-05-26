import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import {
  deleteEventGuestlistEntryService,
  updateEventGuestlistEntryService,
} from "@/lib/services/event-editor-service";
import { guestlistEntryMutationSchema, idAndGuestlistEntryIdParamsSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
    entryId: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, entryId } = await parseRouteParams(context.params, idAndGuestlistEntryIdParamsSchema);
    const payload = await parseJsonBody(request, guestlistEntryMutationSchema);
    return updateEventGuestlistEntryService(id, entryId, payload);
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, entryId } = await parseRouteParams(context.params, idAndGuestlistEntryIdParamsSchema);
    return deleteEventGuestlistEntryService(id, entryId);
  });
}
