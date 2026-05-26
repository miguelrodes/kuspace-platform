import { withRouteHandler, parseJsonBody } from "@/lib/http/route";
import { createEventService } from "@/lib/services/event-service";
import { createDraftEventRequestSchema } from "@/lib/validation/store";

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const event = await parseJsonBody(request, createDraftEventRequestSchema);
    return createEventService(event);
  }, { successStatus: 201 });
}
