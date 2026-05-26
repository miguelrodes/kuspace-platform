import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "@/types/event";
import type { ConsumerUser } from "@/types/user";
import { buildConsumerUser, buildLivePublicEvent } from "@/tests/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  getEventById: vi.fn(),
  getEventBySlug: vi.fn(),
  saveEventAggregate: vi.fn(),
  deleteEventAggregate: vi.fn(),
  getStoreUserById: vi.fn(),
  saveConsumerUser: vi.fn(),
}));

vi.mock("@/lib/db/store-repository", () => ({
  getEventById: mocks.getEventById,
  getEventBySlug: mocks.getEventBySlug,
  saveEventAggregate: mocks.saveEventAggregate,
  deleteEventAggregate: mocks.deleteEventAggregate,
  getStoreUserById: mocks.getStoreUserById,
  saveConsumerUser: mocks.saveConsumerUser,
}));

import {
  deleteEventRepositoryAggregate,
  getEventRepositoryById,
  getEventRepositoryBySlug,
  saveEventRepositoryAggregate,
} from "@/lib/db/repositories/event-repository";
import {
  getConsumerRepositoryById,
  saveConsumerRepository,
} from "@/lib/db/repositories/consumer-repository";

describe("repository smoke tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("event repository delegates reads and writes to the store repository", async () => {
    const event = buildLivePublicEvent();
    mocks.getEventById.mockResolvedValue(event);
    mocks.getEventBySlug.mockResolvedValue(event);
    mocks.saveEventAggregate.mockResolvedValue(event);

    await expect(getEventRepositoryById(event.id)).resolves.toEqual(event);
    await expect(getEventRepositoryBySlug(event.slug)).resolves.toEqual(event);
    await expect(saveEventRepositoryAggregate(event)).resolves.toEqual(event);
    await deleteEventRepositoryAggregate(event.id);

    expect(mocks.getEventById).toHaveBeenCalledWith(event.id);
    expect(mocks.getEventBySlug).toHaveBeenCalledWith(event.slug);
    expect(mocks.saveEventAggregate).toHaveBeenCalledWith(event);
    expect(mocks.deleteEventAggregate).toHaveBeenCalledWith(event.id);
  });

  it("consumer repository delegates reads and writes to the store repository", async () => {
    const user = buildConsumerUser();
    mocks.getStoreUserById.mockResolvedValue(user);
    mocks.saveConsumerUser.mockResolvedValue(user);

    await expect(getConsumerRepositoryById(user.id)).resolves.toEqual(user);
    await expect(saveConsumerRepository(user)).resolves.toEqual(user);

    expect(mocks.getStoreUserById).toHaveBeenCalledWith(user.id);
    expect(mocks.saveConsumerUser).toHaveBeenCalledWith(user);
  });
});
