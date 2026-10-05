import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../lib/demo-event-art-manifest.json";
import { HISTORICAL_DEMO_FALLBACK, resolveHistoricalDemoArt } from "../lib/demo-event-art";
import seed from "../prisma/platform-demo-seed.json";

describe("public historical event artwork", () => {
  it("maps every seeded event to distinct local original artwork", () => {
    const artworks = Object.values(manifest);
    expect(artworks).toHaveLength(seed.events.length);
    expect(new Set(artworks.map((artwork) => artwork.imageUrl)).size).toBe(seed.events.length);
    expect(new Set(artworks.map((artwork) => artwork.family)).size).toBeGreaterThanOrEqual(8);

    for (const event of seed.events) {
      const resolved = resolveHistoricalDemoArt(event.slug, event.cover.imageUrl, event.cover.imageAlt);
      expect(resolved.imageUrl).toBe(`/demo/event-art/${event.slug}.svg`);
      expect(resolved.imageAlt).toContain(event.cover.title);

      const file = path.join(process.cwd(), "public", resolved.imageUrl.slice(1));
      expect(existsSync(file)).toBe(true);
      const svg = readFileSync(file, "utf8");
      expect(svg).toContain("<svg");
      expect(svg).toContain("Original abstract artwork made for the KUSPACE public demo");
      expect(svg).not.toMatch(/<(?:image|use|foreignObject)\b/i);
      expect(svg).not.toMatch(/(?:href|url\()\s*[="']?https?:/i);
    }
  });

  it("retains the fallback and never replaces custom event covers", () => {
    expect(existsSync(path.join(process.cwd(), "public", HISTORICAL_DEMO_FALLBACK.slice(1)))).toBe(true);
    expect(resolveHistoricalDemoArt(seed.events[0].slug, "/uploads/custom.webp", "Custom art")).toEqual({
      imageUrl: "/uploads/custom.webp",
      imageAlt: "Custom art",
    });
    expect(resolveHistoricalDemoArt("unmapped-event", HISTORICAL_DEMO_FALLBACK, "Fallback art")).toEqual({
      imageUrl: HISTORICAL_DEMO_FALLBACK,
      imageAlt: "Fallback art",
    });
  });
});
