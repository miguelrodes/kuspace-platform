import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDemoSandbox } from "@/lib/demo/sandbox-seed";

const { requireProfile, saveProfile } = vi.hoisted(() => ({
  requireProfile: vi.fn(),
  saveProfile: vi.fn(),
}));

vi.mock("@/lib/services/access-service", () => ({
  requireCurrentRecruiterProfileService: requireProfile,
}));
vi.mock("@/lib/db/repositories/recruiter-repository", () => ({
  saveRecruiterRepository: saveProfile,
}));

import { updateRecruiterProfileService } from "@/lib/services/recruiter-service";

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.unstubAllEnvs());

it("still saves the authorized recruiter profile outside demo mode", async () => {
  vi.stubEnv("KUSPACE_DEMO_MODE", "false");
  const profile = createDemoSandbox("recruiter").recruiters[0];
  requireProfile.mockResolvedValue({ profile });
  saveProfile.mockImplementation(async (value) => value);

  await expect(updateRecruiterProfileService({ ...profile, bio: "Updated bio" }))
    .resolves.toMatchObject({ id: profile.id, bio: "Updated bio" });
  expect(requireProfile).toHaveBeenCalledOnce();
  expect(saveProfile).toHaveBeenCalledOnce();
});

it("preserves cross-owner edit protection outside demo mode", async () => {
  vi.stubEnv("KUSPACE_DEMO_MODE", "false");
  const [profile, otherProfile] = createDemoSandbox("recruiter").recruiters;
  requireProfile.mockResolvedValue({ profile });

  await expect(updateRecruiterProfileService(otherProfile))
    .rejects.toMatchObject({ status: 403 });
  expect(saveProfile).not.toHaveBeenCalled();
});
