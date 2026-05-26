import type { RecruiterProfile } from "@/types/profile";
import type { RecruiterProfileInput } from "@/lib/validation/store";
import { forbidden } from "@/lib/http/errors";
import { recruiterProfileSchema } from "@/lib/validation/store";
import { saveRecruiterRepository } from "@/lib/db/repositories/recruiter-repository";
import { requireCurrentRecruiterProfileService } from "@/lib/services/access-service";

function normalizeRecruiterProfileInput(profile: RecruiterProfileInput): RecruiterProfile {
  return {
    ...profile,
    location: profile.location?.displayText ? { displayText: profile.location.displayText } : undefined,
  };
}

export async function updateRecruiterProfileService(profile: RecruiterProfileInput) {
  const nextProfile = normalizeRecruiterProfileInput(recruiterProfileSchema.parse(profile));
  const { profile: currentProfile } = await requireCurrentRecruiterProfileService();

  if (nextProfile.id !== currentProfile.id) {
    throw forbidden("You can only update the recruiter profile for your current organization.");
  }

  return saveRecruiterRepository(nextProfile);
}
