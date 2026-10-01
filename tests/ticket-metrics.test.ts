import { describe, expect, it } from "vitest";
import { DEMO_REFERENCE_NOW_ISO, getDemoReferenceNow } from "@/lib/demo-clock";
import { computeTicketsPerHour } from "@/lib/ticket-metrics";

describe("demo ticket analytics clock", () => {
  it("returns a fresh date at the documented fictional current time", () => {
    const first = getDemoReferenceNow();
    const second = getDemoReferenceNow();

    expect(first.toISOString()).toBe(DEMO_REFERENCE_NOW_ISO);
    expect(second.toISOString()).toBe(DEMO_REFERENCE_NOW_ISO);
    expect(second).not.toBe(first);
  });

  it("uses the demo reference time for open-ended ticket velocity", () => {
    expect(computeTicketsPerHour(48, "2030-05-13T23:30:00.000Z")).toBe(1);
  });

  it("uses an explicit sales end when provided", () => {
    expect(
      computeTicketsPerHour(
        24,
        "2030-05-01T10:00:00.000Z",
        "2030-05-02T10:00:00.000Z",
      ),
    ).toBe(1);
  });

  it("returns zero for missing, invalid, or non-positive ranges", () => {
    expect(computeTicketsPerHour(0, "2030-05-01T10:00:00.000Z")).toBe(0);
    expect(computeTicketsPerHour(10)).toBe(0);
    expect(computeTicketsPerHour(10, "not-a-date")).toBe(0);
    expect(
      computeTicketsPerHour(10, "2030-05-16T10:00:00.000Z", undefined),
    ).toBe(0);
  });
});
