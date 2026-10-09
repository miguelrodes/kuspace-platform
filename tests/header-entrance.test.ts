import { expect, it } from "vitest";
import { createHeaderEntranceTracker } from "@/lib/header-entrance";

it("only consumes the intro on the first visit to Home", () => {
  const claim = createHeaderEntranceTracker();
  expect(claim("/recprofile/space-ibiza", "/rechome")).toBe(false);
  expect(claim("/office", "/rechome")).toBe(false);
  expect(claim("/rechome", "/rechome")).toBe(true);
  expect(claim("/office", "/rechome")).toBe(false);
  expect(claim("/rechome", "/rechome")).toBe(false);
});

it("tracks recruiter and clubgoer entrances consistently and independently", () => {
  const claim = createHeaderEntranceTracker();
  for (const home of ["/rechome", "/conshome"]) {
    expect(claim(home, home)).toBe(true);
    expect(claim(home, home)).toBe(false);
    expect(claim("/cons/profile/me", home)).toBe(false);
    expect(claim(home, home)).toBe(false);
  }
});

it("allows a fresh intro in a new page session without browser storage", () => {
  const firstSession = createHeaderEntranceTracker();
  firstSession("/rechome", "/rechome");
  const newSession = createHeaderEntranceTracker();
  expect(newSession("/rechome", "/rechome")).toBe(true);
});
