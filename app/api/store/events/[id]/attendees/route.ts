import { parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { getOwnedEventAttendeeReportService } from "@/lib/services/attendee-service";
import { idParamsSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<unknown>;
};

export async function GET(_: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id } = await parseRouteParams(context.params, idParamsSchema);
    return getOwnedEventAttendeeReportService(id);
  });
}
