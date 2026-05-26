import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import {
  deleteEventTicketSectionService,
  upsertEventTicketSectionService,
} from "@/lib/services/event-editor-service";
import { idAndSectionIdParamsSchema, ticketSectionMutationSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
    sectionId: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, sectionId } = await parseRouteParams(context.params, idAndSectionIdParamsSchema);
    const payload = await parseJsonBody(request, ticketSectionMutationSchema);
    return upsertEventTicketSectionService(id, {
      ...payload,
      section: {
        ...payload.section,
        id: sectionId,
      },
    });
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, sectionId } = await parseRouteParams(context.params, idAndSectionIdParamsSchema);
    return deleteEventTicketSectionService(id, sectionId);
  });
}
