import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import {
  deleteEventTicketPhaseService,
  upsertEventTicketPhaseService,
} from "@/lib/services/event-editor-service";
import { idSectionAndPhaseParamsSchema, ticketPhaseMutationSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
    sectionId: string;
    phaseId: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, sectionId, phaseId } = await parseRouteParams(context.params, idSectionAndPhaseParamsSchema);
    const payload = await parseJsonBody(request, ticketPhaseMutationSchema);
    return upsertEventTicketPhaseService(id, sectionId, {
      ...payload,
      phase: {
        ...payload.phase,
        id: phaseId,
      },
    });
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, sectionId, phaseId } = await parseRouteParams(context.params, idSectionAndPhaseParamsSchema);
    return deleteEventTicketPhaseService(id, sectionId, phaseId);
  });
}
