import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { createEventGuestlistEntryService } from "@/lib/services/event-editor-service";
import { guestlistEntryMutationSchema, idParamsSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id } = await parseRouteParams(context.params, idParamsSchema);
    const payload = await parseJsonBody(request, guestlistEntryMutationSchema);
    return createEventGuestlistEntryService(id, payload);
  }, { successStatus: 201 });
}
