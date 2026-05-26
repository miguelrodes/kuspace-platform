import { describe, expect, it } from "vitest";
import { buildLiveCuratedEvent, buildLivePublicEvent } from "@/tests/helpers/fixtures";
import {
  canUserSeeTicketSection,
  getVisibleTicketSectionsForAssignment,
} from "@/lib/event-ticket-visibility";

describe("ticket visibility helpers", () => {
  it("respects public, hidden, and restricted visibility", () => {
    expect(canUserSeeTicketSection({ visibility: "public", allowedGroupIds: [] })).toBe(true);
    expect(canUserSeeTicketSection({ visibility: "hidden", allowedGroupIds: [] })).toBe(false);
    expect(
      canUserSeeTicketSection(
        { visibility: "restricted", allowedGroupIds: ["group-guestlist"] },
        { accessGroupId: "group-guestlist" },
      ),
    ).toBe(true);
    expect(
      canUserSeeTicketSection(
        { visibility: "restricted", allowedGroupIds: ["group-guestlist"] },
        { accessGroupId: "group-vip" },
      ),
    ).toBe(false);
  });

  it("hides curated ticket sections when the user has no assignment", () => {
    const curatedEvent = buildLiveCuratedEvent();
    expect(getVisibleTicketSectionsForAssignment(curatedEvent)).toEqual([]);
  });

  it("returns only visible sections with phases", () => {
    const event = buildLivePublicEvent();
    const sections = getVisibleTicketSectionsForAssignment(event);

    expect(sections.map((section) => section.id)).toEqual(["ticket-section-regular-entry"]);
  });
});
