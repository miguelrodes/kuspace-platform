import { describe, expect, it } from "vitest";
import { assertPublicDemoDatabaseTargets } from "@/prisma/seed-guards";

const pooledUrl = "postgresql://demo:secret@ep-rough-tooth-b7ftobk5-pooler.c-13.us-east-1.aws.neon.tech/neondb";
const directUrl = "postgresql://demo:secret@ep-rough-tooth-b7ftobk5.c-13.us-east-1.aws.neon.tech/neondb";

describe("public demo seed target guard", () => {
  it("accepts the confirmed pooler and direct endpoints for one Neon project", () => {
    expect(() => assertPublicDemoDatabaseTargets(pooledUrl, directUrl)).not.toThrow();
  });

  it("refuses a mismatched or missing database target", () => {
    expect(() => assertPublicDemoDatabaseTargets(pooledUrl, undefined)).toThrow(/Refusing to reset or seed/);
    expect(() => assertPublicDemoDatabaseTargets(pooledUrl, directUrl.replace("neondb", "postgres"))).toThrow(/Refusing to reset or seed/);
    expect(() => assertPublicDemoDatabaseTargets(pooledUrl.replace("rough-tooth", "other-project"), directUrl)).toThrow(/Refusing to reset or seed/);
  });
});
