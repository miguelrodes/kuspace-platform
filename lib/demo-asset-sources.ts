import artwork from "@/lib/original-art-manifest.json";

export type AssetSourceRecord = {
  id: string;
  localPath: string;
  relevantTo: string[];
  originalSourcePage: string | null;
  creatorOrRightsholder: string | null;
  licenceOrPermission: string | null;
  requiredAttribution: string | null;
};

// The source archive did not retain image-level provenance or rights records.
// Do not infer permission or ownership from an event listing or a file name.
export const demoAssetSources: AssetSourceRecord[] = (() => {
  const byPath = new Map<string, AssetSourceRecord>();
  const add = (path: string, subject: string) => {
    const existing = byPath.get(path);
    if (existing) {
      existing.relevantTo.push(subject);
      return;
    }
    byPath.set(path, {
      id: path.split("/").at(-1) ?? path,
      localPath: path,
      relevantTo: [subject],
      originalSourcePage: null,
      creatorOrRightsholder: null,
      licenceOrPermission: null,
      requiredAttribution: null,
    });
  };

  for (const [slug, path] of Object.entries(artwork.events)) add(path, `Event: ${slug}`);
  for (const [slug, media] of Object.entries(artwork.profiles)) {
    add(media.avatarImageUrl, `Profile avatar: ${slug}`);
    add(media.bannerImageUrl, `Profile banner: ${slug}`);
  }

  return [...byPath.values()].sort((a, b) => a.id.localeCompare(b.id));
})();
