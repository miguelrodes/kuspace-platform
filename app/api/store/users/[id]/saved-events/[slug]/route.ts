import { parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { saveConsumerEventService, unsaveConsumerEventService } from "@/lib/services/consumer-service";
import { idAndSlugParamsSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<unknown>;
};

export async function POST(_request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, slug } = await parseRouteParams(context.params, idAndSlugParamsSchema);
    return saveConsumerEventService(id, slug);
  }, { successStatus: 201 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, slug } = await parseRouteParams(context.params, idAndSlugParamsSchema);
    return unsaveConsumerEventService(id, slug);
  });
}
