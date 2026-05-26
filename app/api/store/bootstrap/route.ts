import { withRouteHandler } from "@/lib/http/route";
import { getStoreBootstrapService } from "@/lib/services/bootstrap-service";

export async function GET() {
  return withRouteHandler(async () => getStoreBootstrapService());
}
