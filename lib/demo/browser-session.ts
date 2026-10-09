"use client";

import {
  SANDBOX_STORAGE,
  sandboxRequest,
  type DemoSandbox,
  type DemoRole,
} from "./sandbox";
import { upgradeDemoTicketSales } from "./upgrade-ticket-sales";

export function readDemoSession(): DemoSandbox | null {
  if (
    typeof document === "undefined" ||
    document.documentElement.dataset.publicDemo !== "true"
  )
    return null;
  const raw = sessionStorage.getItem(SANDBOX_STORAGE);
  if (!raw) return null;
  const session = JSON.parse(raw) as DemoSandbox;
  if (
    session.version !== 1 ||
    !["recruiter", "consumer"].includes(session.role)
  )
    throw new Error("Reset the demo to restore this session.");

  let changed = upgradeDemoTicketSales(session);
  const dc10Profile = session.recruiters.find(
    (profile) => profile.slug === "dc10-ibiza",
  );
  if (dc10Profile) {
    const currentLinks = dc10Profile.links ?? {};
    const instagram = currentLinks.instagram ||
      "https://www.instagram.com/dc10ibizaofficial/";
    const residentAdvisor = currentLinks.residentAdvisor || "https://ra.co/clubs/1273";
    if (
      instagram !== currentLinks.instagram ||
      residentAdvisor !== currentLinks.residentAdvisor
    ) {
      dc10Profile.links = {
        ...currentLinks,
        instagram,
        residentAdvisor,
      };
      changed = true;
    }
  }

  if (changed) sessionStorage.setItem(SANDBOX_STORAGE, JSON.stringify(session));

  return session;
}

export function isVisitorDemoSession() {
  try {
    return readDemoSession() !== null;
  } catch {
    return false;
  }
}

export async function startDemoSession(role: DemoRole) {
  // Check storage before enabling the server's sandbox-only routing boundary.
  sessionStorage.setItem("kuspace_demo_storage_check", "1");
  sessionStorage.removeItem("kuspace_demo_storage_check");
  const response = await fetch("/api/demo/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!response.ok)
    throw new Error("The demo could not be started. Please try again.");
  sessionStorage.setItem(
    SANDBOX_STORAGE,
    JSON.stringify(await response.json()),
  );
}

export function requestDemoSession(path: string, init?: RequestInit) {
  const session = readDemoSession();
  if (!session) return null;
  const result = sandboxRequest(
    session,
    path,
    init?.method ?? "GET",
    init?.body ? JSON.parse(String(init.body)) : {},
  );
  if (init?.method && init.method !== "GET")
    sessionStorage.setItem(SANDBOX_STORAGE, JSON.stringify(session));
  return { result };
}
