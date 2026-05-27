import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { purchaseTicketSectionService } from "@/lib/services/ticket-service";
import { idParamsSchema, purchaseTicketSectionSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id } = await parseRouteParams(context.params, idParamsSchema);
    const body = await parseJsonBody(request, purchaseTicketSectionSchema);

    return purchaseTicketSectionService({
      eventId: id,
      userId: body.userId,
      sectionId: body.sectionId,
      phaseId: body.phaseId,
      quantity: body.quantity,
    });
  });
}
