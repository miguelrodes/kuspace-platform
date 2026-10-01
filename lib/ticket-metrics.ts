import { getDemoReferenceNow } from "@/lib/demo-clock";

export function computeTicketsPerHour(
  sold: number,
  salesStart?: string,
  salesEnd?: string,
  referenceNow: Date = getDemoReferenceNow(),
) {
  if (sold <= 0 || !salesStart) {
    return 0;
  }

  const start = new Date(salesStart);
  const end = salesEnd ? new Date(salesEnd) : referenceNow;

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return 0;
  }

  const hours = Math.max(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60),
    1,
  );
  return Number((sold / hours).toFixed(1));
}
