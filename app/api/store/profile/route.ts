import { parseJsonBody, withRouteHandler } from "@/lib/http/route";
import { updateRecruiterProfileService } from "@/lib/services/recruiter-service";
import { recruiterProfileSchema } from "@/lib/validation/store";

export async function PUT(request: Request) {
  return withRouteHandler(async () => {
    const profile = await parseJsonBody(request, recruiterProfileSchema);
    return updateRecruiterProfileService(profile);
  });
}
