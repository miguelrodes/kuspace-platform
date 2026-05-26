import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { upsertEventTicketPhaseService } from "@/lib/services/event-editor-service";
import { idAndSectionIdParamsSchema, ticketPhaseMutationSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
    sectionId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, sectionId } = await parseRouteParams(context.params, idAndSectionIdParamsSchema);
    const payload = await parseJsonBody(request, ticketPhaseMutationSchema);
    return upsertEventTicketPhaseService(id, sectionId, payload);
  }, { successStatus: 201 });
}
