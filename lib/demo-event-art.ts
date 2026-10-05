import manifest from "./demo-event-art-manifest.json";

export const HISTORICAL_DEMO_FALLBACK = "/demo/event-covers/historical-programming.svg";

type DemoArtwork = { imageUrl: string; imageAlt: string; family: string };
const artworkBySlug = manifest as Record<string, DemoArtwork>;

export function resolveHistoricalDemoArt(slug: string, imageUrl: string, imageAlt: string) {
  const artwork = artworkBySlug[slug];
  if (!artwork || imageUrl !== HISTORICAL_DEMO_FALLBACK) {
    return { imageUrl, imageAlt };
  }

  return { imageUrl: artwork.imageUrl, imageAlt: artwork.imageAlt };
}
