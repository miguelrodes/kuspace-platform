import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { createEventTimetableRowService } from "@/lib/services/event-editor-service";
import { idParamsSchema, timetableRowMutationSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id } = await parseRouteParams(context.params, idParamsSchema);
    const payload = await parseJsonBody(request, timetableRowMutationSchema);
    return createEventTimetableRowService(id, payload);
  }, { successStatus: 201 });
}
