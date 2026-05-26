import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import {
  deleteEventBudgetItemService,
  upsertEventBudgetItemService,
} from "@/lib/services/event-editor-service";
import { budgetItemMutationSchema, idAndItemIdParamsSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, itemId } = await parseRouteParams(context.params, idAndItemIdParamsSchema);
    const payload = await parseJsonBody(request, budgetItemMutationSchema);
    return upsertEventBudgetItemService(id, {
      ...payload,
      item: {
        ...payload.item,
        id: itemId,
      },
    });
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id, itemId } = await parseRouteParams(context.params, idAndItemIdParamsSchema);
    return deleteEventBudgetItemService(id, itemId);
  });
}
