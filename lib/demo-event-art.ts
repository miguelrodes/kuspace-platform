import manifest from "./original-art-manifest.json";

export const HISTORICAL_DEMO_FALLBACK = "/demo/event-covers/historical-programming.svg";

const artworkBySlug = manifest.events as Record<string, string>;
const profileArtwork = manifest.profiles as Record<string, { avatarImageUrl: string; bannerImageUrl: string }>;

const PROFILE_AVATAR_FALLBACK = "/demo/profiles/recruiter-archive-avatar.svg";
const PROFILE_BANNER_FALLBACK = "/demo/profiles/recruiter-archive-banner.svg";

export function resolveHistoricalDemoArt(slug: string, imageUrl: string, imageAlt: string) {
  const artwork = artworkBySlug[slug];
  if (!artwork || imageUrl !== HISTORICAL_DEMO_FALLBACK) {
    return { imageUrl, imageAlt };
  }

  return { imageUrl: artwork, imageAlt };
}

export function resolveRecruiterDemoArt(
  slug: string,
  media: { avatarImageUrl?: string; bannerImageUrl?: string },
) {
  const artwork = profileArtwork[slug];
  if (!artwork) {
    return media;
  }

  return {
    avatarImageUrl: media.avatarImageUrl === PROFILE_AVATAR_FALLBACK ? artwork.avatarImageUrl : media.avatarImageUrl,
    bannerImageUrl: media.bannerImageUrl === PROFILE_BANNER_FALLBACK ? artwork.bannerImageUrl : media.bannerImageUrl,
  };
}

export function resolveRecruiterLabelAvatar(profileSlug: string | undefined, avatarImageUrl: string | undefined) {
  if (avatarImageUrl !== PROFILE_AVATAR_FALLBACK || !profileSlug) {
    return avatarImageUrl;
  }

  return profileArtwork[profileSlug]?.avatarImageUrl ?? avatarImageUrl;
}
