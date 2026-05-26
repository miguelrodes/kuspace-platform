import type { ConsumerUser } from "@/types/user";
import {
  getAllConsumers,
  getConsumersByIds,
  getStoreUserById,
  saveConsumerUser,
} from "@/lib/db/store-repository";

export async function getConsumerRepositoryById(id: string) {
  return getStoreUserById(id);
}

export async function getAllConsumersRepository() {
  return getAllConsumers();
}

export async function getConsumersRepositoryByIds(ids: string[]) {
  return getConsumersByIds(ids);
}

export async function saveConsumerRepository(user: ConsumerUser) {
  return saveConsumerUser(user);
}
