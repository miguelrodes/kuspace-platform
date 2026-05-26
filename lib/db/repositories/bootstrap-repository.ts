import { getBootstrapState } from "@/lib/db/store-repository";

export async function getStoreBootstrapRepository() {
  return getBootstrapState();
}
