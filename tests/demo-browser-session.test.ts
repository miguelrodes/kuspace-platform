import { afterEach, expect, it, vi } from "vitest";
import { createDemoSandbox } from "@/lib/demo/sandbox-seed";
import {
  readDemoSession,
  requestDemoSession,
} from "@/lib/demo/browser-session";
import { SANDBOX_STORAGE } from "@/lib/demo/sandbox";

afterEach(() => vi.unstubAllGlobals());

it("persists reloadable per-tab edits without network requests, and fails closed on quota errors", () => {
  let raw = JSON.stringify(createDemoSandbox("consumer"));
  const otherVisitor = raw;
  const fetch = vi.fn();
  const storage = {
    getItem: vi.fn(() => raw),
    setItem: vi.fn((_key: string, value: string) => {
      raw = value;
    }),
  };
  vi.stubGlobal("document", {
    documentElement: { dataset: { publicDemo: "true" } },
  });
  vi.stubGlobal("sessionStorage", storage);
  vi.stubGlobal("fetch", fetch);
  const userId = readDemoSession()!.consumerId;
  requestDemoSession("/api/store/users/" + userId, {
    method: "PUT",
    body: JSON.stringify({ city: "My tab" }),
  });
  expect(storage.setItem).toHaveBeenCalledWith(
    SANDBOX_STORAGE,
    expect.any(String),
  );
  expect(readDemoSession()!.users[0].city).toBe("My tab");
  expect(JSON.parse(otherVisitor).users[0].city).toBe("Ibiza");
  storage.setItem.mockImplementation(() => {
    throw new Error("Quota exceeded");
  });
  expect(() =>
    requestDemoSession("/api/store/users/" + userId, {
      method: "PUT",
      body: JSON.stringify({ city: "Must not save" }),
    }),
  ).toThrow("Quota exceeded");
  expect(readDemoSession()!.users[0].city).toBe("My tab");
  expect(fetch).not.toHaveBeenCalled();
});

it("ignores persisted sandbox data when the server has not enabled demo mode", () => {
  vi.stubGlobal("document", { documentElement: { dataset: {} } });
  const getItem = vi.fn();
  vi.stubGlobal("sessionStorage", { getItem });
  expect(readDemoSession()).toBeNull();
  expect(getItem).not.toHaveBeenCalled();
});

it("persists upgraded sales history before bootstrapping an existing visitor session", () => {
  const session = createDemoSandbox("recruiter");
  const afterlife = session.events.find((event) => event.id === "event-019")!;
  delete afterlife.tickets.salesHistory;
  for (const section of afterlife.tickets.sections!) {
    for (const phase of section.phases) phase.quantitySold = 0;
  }
  afterlife.tickets.sections![0].phases[0].quantitySold = 3;
  let raw = JSON.stringify(session);
  const storage = {
    getItem: vi.fn(() => raw),
    setItem: vi.fn((_key: string, value: string) => { raw = value; }),
  };
  vi.stubGlobal("document", { documentElement: { dataset: { publicDemo: "true" } } });
  vi.stubGlobal("sessionStorage", storage);
  const migrated = readDemoSession()!.events.find((event) => event.id === afterlife.id)!;
  expect(migrated.guestlist.summary?.ticketsSold).toBe(1816);
  expect(migrated.tickets.salesHistory?.phases.length).toBeGreaterThan(0);
  readDemoSession();
  expect(storage.setItem).toHaveBeenCalledTimes(1);
});

it("adds DC10 social links to existing sessions without discarding visitor changes", () => {
  const session = createDemoSandbox("consumer");
  const dc10 = session.recruiters.find((profile) => profile.slug === "dc10-ibiza")!;
  dc10.links = { website: "https://dc10ibiza.com/" };
  session.users[0].city = "My saved city";
  let raw = JSON.stringify(session);
  const storage = {
    getItem: vi.fn(() => raw),
    setItem: vi.fn((_key: string, value: string) => {
      raw = value;
    }),
  };
  vi.stubGlobal("document", {
    documentElement: { dataset: { publicDemo: "true" } },
  });
  vi.stubGlobal("sessionStorage", storage);

  const migrated = readDemoSession()!;
  const migratedDc10 = migrated.recruiters.find(
    (profile) => profile.slug === "dc10-ibiza",
  )!;

  expect(migratedDc10.links).toEqual({
    website: "https://dc10ibiza.com/",
    instagram: "https://www.instagram.com/dc10ibizaofficial/",
    residentAdvisor: "https://ra.co/clubs/1273",
  });
  expect(migrated.users[0].city).toBe("My saved city");
  expect(storage.setItem).toHaveBeenCalledWith(
    SANDBOX_STORAGE,
    expect.any(String),
  );
});
