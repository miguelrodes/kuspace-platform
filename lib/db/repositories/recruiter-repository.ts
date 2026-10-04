import type { RecruiterProfile } from "@/types/profile";
import * as storeRepository from "@/lib/db/store-repository";

export async function getRecruiterRepository() {
  return storeRepository.getRecruiterProfile();
}

export async function getRecruiterRepositorySummary() {
  return storeRepository.getRecruiterProfileSummary();
}

export async function getAllRecruiterProfilesRepository() {
  return storeRepository.getAllRecruiterProfiles();
}

export async function getRecruiterRepositoryById(id: string) {
  return storeRepository.getRecruiterProfileById(id);
}

export async function getRecruiterRepositoryByIdSummary(id: string) {
  return storeRepository.getRecruiterProfileByIdSummary(id);
}

export async function getRecruiterRepositoryByOrganizationId(organizationId: string) {
  const profile = await storeRepository.getRecruiterProfileByOrganizationId(organizationId);
  return profile;
}

export async function getRecruiterRepositoryByOrganizationIdSummary(organizationId: string) {
  return storeRepository.getRecruiterProfileByOrganizationIdSummary(organizationId);
}

export async function saveRecruiterRepository(profile: RecruiterProfile) {
  await storeRepository.saveRecruiterProfile(profile);
  return storeRepository.getRecruiterProfileById(profile.id);
}
