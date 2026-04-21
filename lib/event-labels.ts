import type { Event, EventLabel } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";

export function buildOwnerEventLabel(recruiter: RecruiterProfile): EventLabel {
  return {
    id: recruiter.id,
    name: recruiter.displayName,
    profileSlug: recruiter.slug,
    avatarImageUrl: recruiter.media?.avatarImageUrl,
  };
}

export function resolveEventLabels(
  event: Pick<Event, "labels">,
  recruiter?: RecruiterProfile,
): EventLabel[] {
  if (event.labels?.length) {
    return event.labels;
  }

  return recruiter ? [buildOwnerEventLabel(recruiter)] : [];
}
