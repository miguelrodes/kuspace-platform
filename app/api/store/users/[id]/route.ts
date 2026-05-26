import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { updateConsumerUserService } from "@/lib/services/consumer-service";
import { consumerProfileUpdateSchema, idParamsSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id } = await parseRouteParams(context.params, idParamsSchema);
    const user = await parseJsonBody(request, consumerProfileUpdateSchema);
    return updateConsumerUserService(id, user);
  });
}
