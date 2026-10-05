import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../lib/original-art-manifest.json";
import {
  HISTORICAL_DEMO_FALLBACK,
  resolveHistoricalDemoArt,
  resolveRecruiterDemoArt,
  resolveRecruiterLabelAvatar,
} from "../lib/demo-event-art";
import seed from "../prisma/platform-demo-seed.json";

function assetExists(url: string) {
  return existsSync(path.join(process.cwd(), "public", url.slice(1)));
}

describe("copied private artwork", () => {
  it("maps every seeded event by slug to an existing local image", () => {
    expect(Object.keys(manifest.events).sort()).toEqual(seed.events.map((event) => event.slug).sort());

    for (const event of seed.events) {
      const resolved = resolveHistoricalDemoArt(event.slug, event.cover.imageUrl, event.cover.imageAlt);
      expect(resolved.imageUrl).toBe(manifest.events[event.slug as keyof typeof manifest.events]);
      expect(resolved.imageUrl).toMatch(/^\/demo\/original-art\/event-covers\/.+\.(?:jpg|png)$/);
      expect(assetExists(resolved.imageUrl)).toBe(true);
      expect(resolved.imageAlt).toBe(event.cover.imageAlt);
    }

    const privateFallback = "/demo/original-art/event-covers/draft-placeholder.jpg";
    expect(Object.values(manifest.events).filter((url) => url === privateFallback)).toHaveLength(3);
    expect(new Set(Object.values(manifest.events)).size).toBe(25);
  });

  it("maps both recruiter avatars and banners without replacing custom art", () => {
    expect(Object.keys(manifest.profiles).sort()).toEqual(seed.profiles.map((profile) => profile.slug).sort());

    for (const profile of seed.profiles) {
      const resolved = resolveRecruiterDemoArt(profile.slug, profile.media);
      const expected = manifest.profiles[profile.slug as keyof typeof manifest.profiles];
      expect(resolved).toEqual(expected);
      expect(assetExists(resolved.avatarImageUrl!)).toBe(true);
      expect(assetExists(resolved.bannerImageUrl!)).toBe(true);
      expect(resolveRecruiterLabelAvatar(profile.slug, profile.media.avatarImageUrl)).toBe(expected.avatarImageUrl);
      expect(resolveRecruiterDemoArt(profile.slug, { avatarImageUrl: "/uploads/custom.jpg" }).avatarImageUrl)
        .toBe("/uploads/custom.jpg");
    }
  });

  it("keeps a generic fallback for unmapped events and removes generated event art", () => {
    expect(assetExists(HISTORICAL_DEMO_FALLBACK)).toBe(true);
    expect(resolveHistoricalDemoArt("unknown-event", HISTORICAL_DEMO_FALLBACK, "Fallback art")).toEqual({
      imageUrl: HISTORICAL_DEMO_FALLBACK,
      imageAlt: "Fallback art",
    });
    expect(resolveHistoricalDemoArt(seed.events[0].slug, "/uploads/custom.webp", "Custom art")).toEqual({
      imageUrl: "/uploads/custom.webp",
      imageAlt: "Custom art",
    });
    const syntheticDir = path.join(process.cwd(), "public/demo/event-art");
    expect(existsSync(syntheticDir) ? readdirSync(syntheticDir) : []).toHaveLength(0);
  });
});
