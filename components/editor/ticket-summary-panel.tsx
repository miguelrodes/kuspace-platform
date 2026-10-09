"use client";

import { useMemo, useState } from "react";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import type { TicketSectionDraft } from "@/components/editor/ticket-tier-card";
import { getDemoReferenceNow } from "@/lib/demo-clock";
import type { TicketSalesHistory } from "@/types/event";
import { buildTicketSalesSeries } from "@/lib/ticket-sales-series";

type TicketSummaryPanelProps = {
  sections: TicketSectionDraft[];
  salesHistory?: TicketSalesHistory;
};

type TimeWindow = "full" | "24h";

type ChartPoint = {
  label: string;
  timestamp: number;
  value: number;
};

type NormalizedPhaseMetrics = {
  sectionId: string;
  phaseName: string;
  quantityAvailable: number;
  quantitySold: number;
  price: number;
  status: TicketSectionDraft["phases"][number]["status"];
  salesStart?: string;
  salesEnd?: string;
};

const PROTOTYPE_NOW = getDemoReferenceNow();
const ONE_HOUR_MS = 60 * 60 * 1000;

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTicketsPerHour(value: number) {
  return `${value.toFixed(1)} T/h`;
}

function formatAxisLabel(timestamp: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

function formatHourlyAxisLabel(timestamp: number) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function computeTicketsPerHour(sold: number, salesStart?: string, salesEnd?: string) {
  if (sold <= 0 || !salesStart) {
    return 0;
  }

  const start = new Date(salesStart);
  const end = salesEnd ? new Date(salesEnd) : PROTOTYPE_NOW;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 0;
  }

  const hours = Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60), 1);
  return Number((sold / hours).toFixed(1));
}

function buildLinePath(points: number[], width: number, height: number, max: number) {
  if (points.length === 0) return "";

  const stepX = points.length === 1 ? 0 : width / (points.length - 1);

  return points
    .map((point, index) => {
      const x = index * stepX;
      const y = height - (point / max) * height;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function getAnchorTimestamp(sections: TicketSectionDraft[]) {
  const hasLivePhase = sections.some((section) =>
    section.phases.some((phase) => phase.status === "live"),
  );

  if (hasLivePhase) {
    return PROTOTYPE_NOW.getTime();
  }

  const timestamps = sections.flatMap((section) =>
    section.phases.flatMap((phase) => {
      const values: number[] = [];
      if (phase.salesStart) values.push(new Date(phase.salesStart).getTime());
      if (phase.salesEnd) values.push(new Date(phase.salesEnd).getTime());
      return values;
    }),
  );

  const latestTimestamp = timestamps
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0];

  return latestTimestamp ?? PROTOTYPE_NOW.getTime();
}

function soldByTime(sold: number, salesStart?: string, salesEnd?: string, timestamp?: number) {
  if (!sold || !salesStart || !timestamp) {
    return 0;
  }

  const start = new Date(salesStart).getTime();
  const end = salesEnd ? new Date(salesEnd).getTime() : PROTOTYPE_NOW.getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }

  if (timestamp <= start) {
    return 0;
  }

  if (timestamp >= end) {
    return sold;
  }

  const progress = (timestamp - start) / (end - start);
  return sold * progress;
}

function phaseRateAtTime(sold: number, salesStart?: string, salesEnd?: string, timestamp?: number) {
  if (!sold || !salesStart || !timestamp) {
    return 0;
  }

  const start = new Date(salesStart).getTime();
  const end = salesEnd ? new Date(salesEnd).getTime() : PROTOTYPE_NOW.getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }

  if (timestamp < start || timestamp > end) {
    return 0;
  }

  const hours = Math.max((end - start) / ONE_HOUR_MS, 1);
  return sold / hours;
}

function buildTwoHourRange(start: number, end: number) {
  const range: number[] = [];
  const step = 2 * ONE_HOUR_MS;
  for (let timestamp = start; timestamp <= end; timestamp += step) {
    range.push(timestamp);
  }
  if (range[range.length - 1] !== end) {
    range.push(end);
  }
  return range;
}

function buildDailyRange(boundaries: number[], anchorTimestamp: number) {
  const byDay = new Map<string, number>();

  for (const timestamp of [...boundaries, anchorTimestamp]) {
    const dayKey = new Date(timestamp).toISOString().slice(0, 10);
    const previous = byDay.get(dayKey);
    if (!previous || timestamp > previous) {
      byDay.set(dayKey, timestamp);
    }
  }

  return Array.from(byDay.values()).sort((a, b) => a - b);
}

function SummaryChart({
  title,
  valueLabel,
  points,
  control,
  window,
}: {
  title: string;
  valueLabel: string;
  points: ChartPoint[];
  control?: React.ReactNode;
  window: TimeWindow;
}) {
  const width = 560;
  const height = 180;
  const chartLeft = 40;
  const chartRight = 14;
  const chartWidth = width - chartLeft - chartRight;
  const scaleFloor = title === "Ticket Velocity" ? 0.01 : 1;
  const max = Math.max(...points.map((point) => point.value), scaleFloor);
  const path = buildLinePath(
    points.map((point) => point.value),
    chartWidth,
    height,
    max,
  );
  const tickPrecision = max < 1 ? 2 : 1;
  const yTicks = [max, max * 0.75, max * 0.5, max * 0.25, 0].map((value) =>
    Number(value.toFixed(tickPrecision)),
  );

  return (
    <div className="min-w-0 rounded-[var(--radius-surface)] border border-border bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-body uppercase tracking-widerish text-fg">{title}</p>
          <p className="mt-1 text-body-sm text-[#9aa1b2]">{valueLabel}</p>
        </div>
        {control ? <div className="shrink-0">{control}</div> : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[34rem]">
          <svg
            viewBox={`0 0 ${width} ${height + 28}`}
            className="h-[14rem] w-full"
            role="img"
            aria-label={`${title}, ${window === "full" ? "full cycle" : "last 24 hours"}`}
          >
            <line
              x1={chartLeft}
              y1={height}
              x2={width - chartRight}
              y2={height}
              stroke="#FFFFFF"
              strokeWidth="1"
            />
            <line x1={chartLeft} y1="0" x2={chartLeft} y2={height} stroke="#FFFFFF" strokeWidth="1" />
            {yTicks.map((tick, index) => {
              const y = (height * index) / (yTicks.length - 1);
              return (
                <text
                  key={`${title}-tick-${tick}-${index}`}
                  x={chartLeft - 6}
                  y={y + 4}
                  textAnchor="end"
                  fill="hsl(var(--muted))"
                  fontSize="11"
                >
                  {tick}
                </text>
              );
            })}
            <path
              d={path}
              fill="none"
              stroke="var(--accent-hex)"
              strokeWidth="2.5"
              transform={`translate(${chartLeft} 0)`}
            />
            {points.map((point, index) => {
              const x =
                points.length === 1
                  ? chartLeft
                  : chartLeft + (index * chartWidth) / (points.length - 1);
              const y = height - (point.value / max) * height;
              const textAnchor =
                index === 0 ? "start" : index === points.length - 1 ? "end" : "middle";
              const showLabel = index % Math.ceil(points.length / 6) === 0 || index === points.length - 1;
              return (
                <g key={`${title}-${point.timestamp}-${index}`}>
                  <circle cx={x} cy={y} r="3" fill="var(--accent-hex)">
                    <title>{`${new Date(point.timestamp).toISOString()}: ${Number(point.value.toFixed(2))} ${valueLabel.toLowerCase()}`}</title>
                  </circle>
                  {showLabel ? <text
                    x={x}
                    y={height + 18}
                    textAnchor={textAnchor}
                    fill="hsl(var(--muted))"
                    fontSize={window === "24h" ? "10" : "12"}
                  >
                    {point.label}
                  </text> : null}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <p className="mt-2 text-right text-body-sm text-[#9aa1b2]">Time</p>
    </div>
  );
}

export function TicketSummaryPanel({ sections, salesHistory }: TicketSummaryPanelProps) {
  const [ticketsWindow, setTicketsWindow] = useState<TimeWindow>("full");
  const [velocityWindow, setVelocityWindow] = useState<TimeWindow>("full");
  const normalizedPhases = useMemo<NormalizedPhaseMetrics[]>(
    () =>
      sections.flatMap((section) =>
        section.phases.map((phase) => ({
          sectionId: section.id,
          phaseName: phase.name,
          quantityAvailable: parseNumber(phase.quantityAvailable),
          quantitySold: parseNumber(phase.quantitySold),
          price: parseNumber(phase.price),
          status: phase.status,
          salesStart: phase.salesStart || undefined,
          salesEnd: phase.salesEnd || undefined,
        })),
      ),
    [sections],
  );
  const phasesBySection = useMemo(() => {
    const grouped = new Map<string, NormalizedPhaseMetrics[]>();

    normalizedPhases.forEach((phase) => {
      const existing = grouped.get(phase.sectionId);

      if (existing) {
        existing.push(phase);
        return;
      }

      grouped.set(phase.sectionId, [phase]);
    });

    return grouped;
  }, [normalizedPhases]);
  const anchorTimestamp = useMemo(() => getAnchorTimestamp(sections), [sections]);

  const metrics = useMemo(() => {
    const totalCapacity = normalizedPhases.reduce(
      (sum, phase) => sum + phase.quantityAvailable,
      0,
    );
    const soldCapacity = normalizedPhases.reduce(
      (sum, phase) => sum + phase.quantitySold,
      0,
    );
    const totalRevenue = normalizedPhases.reduce(
      (sum, phase) => sum + phase.price * phase.quantitySold,
      0,
    );

    const velocityValues = normalizedPhases.map((phase) =>
        computeTicketsPerHour(
          phase.quantitySold,
          phase.salesStart,
          phase.salesEnd,
        ),
    );
    const nonZeroVelocities = velocityValues.filter((value) => value > 0);
    const averageVelocity = salesHistory
      ? buildTicketSalesSeries(salesHistory, "24h").at(-1)?.velocity ?? 0
      : nonZeroVelocities.length
      ? Number(
          (
            nonZeroVelocities.reduce((sum, value) => sum + value, 0) / nonZeroVelocities.length
          ).toFixed(1),
        )
      : 0;

    const weightedPriceBase = normalizedPhases.reduce(
      (sum, phase) => sum + phase.quantityAvailable,
      0,
    );
    const weightedPriceTotal = normalizedPhases.reduce(
      (sum, phase) => sum + phase.price * phase.quantityAvailable,
      0,
    );
    const averageTicketPrice = weightedPriceBase > 0 ? weightedPriceTotal / weightedPriceBase : 0;

    return {
      totalCapacity,
      soldCapacity,
      totalRevenue,
      averageVelocity,
      averageTicketPrice,
    };
  }, [normalizedPhases, salesHistory]);

  const sectionPerformance = useMemo(() => {
    return sections.map((section) => {
      const sectionPhases = phasesBySection.get(section.id) ?? [];
      const capacity = sectionPhases.reduce(
        (sum, phase) => sum + phase.quantityAvailable,
        0,
      );
      const sold = sectionPhases.reduce(
        (sum, phase) => sum + phase.quantitySold,
        0,
      );
      const revenue = sectionPhases.reduce(
        (sum, phase) => sum + phase.price * phase.quantitySold,
        0,
      );
      const livePhase = sectionPhases.find((phase) => phase.status === "live");
      const velocityValues = sectionPhases
        .map((phase) =>
          computeTicketsPerHour(phase.quantitySold, phase.salesStart, phase.salesEnd),
        )
        .filter((value) => value > 0);
      const velocity = salesHistory
        ? buildTicketSalesSeries(salesHistory, "24h", section.id).at(-1)?.velocity ?? 0
        : velocityValues.length
        ? Number(
            (
              velocityValues.reduce((sum, value) => sum + value, 0) / velocityValues.length
            ).toFixed(livePhase ? 2 : 1),
          )
        : 0;

      const upcomingPhase = sectionPhases.find((phase) => phase.status === "upcoming");
      const statusLabel = livePhase
        ? livePhase.phaseName
        : upcomingPhase
          ? upcomingPhase.phaseName
          : "Sold Out";

      return {
        id: section.id,
        name: section.name,
        percentSold: capacity > 0 ? Math.round((sold / capacity) * 100) : 0,
        revenue,
        velocity,
        hasLivePhase: Boolean(livePhase),
        statusLabel,
      };
    });
  }, [phasesBySection, sections, salesHistory]);

  const boundaryTimestamps = useMemo(() => {
    return normalizedPhases
      .flatMap((phase) => {
        const points: number[] = [];
        if (phase.salesStart) {
          points.push(new Date(phase.salesStart).getTime());
        }
        if (phase.salesEnd) {
          points.push(new Date(phase.salesEnd).getTime());
        }
        return points;
      })
      .filter((timestamp) => Number.isFinite(timestamp) && timestamp <= anchorTimestamp)
      .sort((a, b) => a - b);
  }, [anchorTimestamp, normalizedPhases]);

  const ticketsSoldPoints = useMemo(() => {
    const timestamps = buildDailyRange(boundaryTimestamps, anchorTimestamp);

    return timestamps.map((timestamp) => ({
      label: formatAxisLabel(timestamp),
      timestamp,
      value: Math.round(
        normalizedPhases.reduce(
          (sum, phase) =>
            sum +
            soldByTime(
              phase.quantitySold,
              phase.salesStart,
              phase.salesEnd,
              timestamp,
            ),
          0,
        ),
      ),
    }));
  }, [anchorTimestamp, boundaryTimestamps, normalizedPhases]);

  const velocityPoints = useMemo(() => {
    const timestamps = buildDailyRange(boundaryTimestamps, anchorTimestamp);

    return timestamps.map((timestamp) => {
      const totalVelocity = normalizedPhases.reduce(
        (sum, phase) =>
          sum +
          phaseRateAtTime(phase.quantitySold, phase.salesStart, phase.salesEnd, timestamp),
        0,
      );
      return {
        label: formatAxisLabel(timestamp),
        timestamp,
        value: Number(totalVelocity.toFixed(2)),
      };
    });
  }, [anchorTimestamp, boundaryTimestamps, normalizedPhases]);

  const visibleTicketsSoldPoints = useMemo(() => {
    if (salesHistory) {
      return buildTicketSalesSeries(salesHistory, ticketsWindow).map((point) => ({
        timestamp: point.timestamp,
        label: ticketsWindow === "24h" ? formatHourlyAxisLabel(point.timestamp) : formatAxisLabel(point.timestamp),
        value: point.sold,
      }));
    }
    if (ticketsWindow === "full") {
      return ticketsSoldPoints;
    }

    const end = anchorTimestamp;
    const start = end - 24 * ONE_HOUR_MS;
    const hourlyRange = buildTwoHourRange(start, end);

    return hourlyRange.map((timestamp) => ({
      label: formatHourlyAxisLabel(timestamp),
      timestamp,
      value: Math.round(
        normalizedPhases.reduce(
          (sum, phase) =>
            sum +
            soldByTime(
              phase.quantitySold,
              phase.salesStart,
              phase.salesEnd,
              timestamp,
            ),
          0,
        ),
      ),
    }));
  }, [anchorTimestamp, normalizedPhases, ticketsSoldPoints, ticketsWindow, salesHistory]);

  const visibleVelocityPoints = useMemo(() => {
    if (salesHistory) {
      return buildTicketSalesSeries(salesHistory, velocityWindow).map((point) => ({
        timestamp: point.timestamp,
        label: velocityWindow === "24h" ? formatHourlyAxisLabel(point.timestamp) : formatAxisLabel(point.timestamp),
        value: point.velocity,
      }));
    }
    if (velocityWindow === "full") {
      return velocityPoints;
    }

    const end = anchorTimestamp;
    const start = end - 24 * ONE_HOUR_MS;
    const hourlyRange = buildTwoHourRange(start, end);

    return hourlyRange.map((timestamp) => {
      const totalVelocity = normalizedPhases.reduce(
        (sum, phase) =>
          sum +
          phaseRateAtTime(phase.quantitySold, phase.salesStart, phase.salesEnd, timestamp),
        0,
      );
      return {
        label: formatHourlyAxisLabel(timestamp),
        timestamp,
        value: Number(totalVelocity.toFixed(2)),
      };
    });
  }, [anchorTimestamp, normalizedPhases, velocityPoints, velocityWindow, salesHistory]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-1.5">
          <p className="text-body-sm uppercase tracking-widerish text-muted">Total Capacity</p>
          <p className="mt-1 text-sm text-fg">{metrics.totalCapacity}</p>
        </div>
        <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-1.5">
          <p className="text-body-sm uppercase tracking-widerish text-muted">Sold Capacity</p>
          <p className="mt-1 text-sm text-fg">{metrics.soldCapacity}</p>
        </div>
        <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-1.5">
          <p className="text-body-sm uppercase tracking-widerish text-muted">Total Revenue</p>
          <p className="mt-1 text-sm text-fg">{formatCurrency(metrics.totalRevenue)}</p>
        </div>
        <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-1.5">
          <p className="text-body-sm uppercase tracking-widerish text-muted">Ticket Velocity</p>
          <p className="mt-1 text-sm text-fg">{formatTicketsPerHour(metrics.averageVelocity)}</p>
        </div>
        <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-1.5">
          <p className="text-body-sm uppercase tracking-widerish text-muted">Avg Ticket Price</p>
          <p className="mt-1 text-sm text-fg">{formatCurrency(metrics.averageTicketPrice)}</p>
        </div>
      </div>

      <div className="mt-10 space-y-2" style={{ marginTop: "2.5rem" }}>
        <p className="text-body uppercase tracking-widerish text-fg">Section Performance Breakdown</p>
        <div className="flex flex-wrap gap-3">
          {sectionPerformance.map((section) => (
            <div
              key={section.id}
              className="w-[16rem] max-w-full min-w-0 rounded-[var(--radius-surface)] border border-border bg-panel px-4 py-2"
            >
              <div className="space-y-1">
                <div className="border-b border-border pb-1">
                  <p className="truncate text-body uppercase tracking-[0.02em] text-fg">
                    {section.name}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-body text-muted">% Sold</p>
                    <p className="text-body text-fg">{section.percentSold}%</p>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-body text-muted">Revenue</p>
                    <p className="text-body text-fg">{formatCurrency(section.revenue)}</p>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-body text-muted">Velocity</p>
                    <p className="text-body text-fg">
                      {section.velocity.toFixed(section.hasLivePhase ? 2 : 1)} T/h
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-body text-muted">Status</p>
                    <p className="text-body text-fg">{section.statusLabel}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 space-y-2" style={{ marginTop: "2.5rem" }}>
        <p className="text-body uppercase tracking-widerish text-fg">Ticket Metrics</p>
        <div className="grid gap-4 xl:grid-cols-2">
          <SummaryChart
            title="Tickets Sold Cumulative"
            valueLabel="Tickets sold"
            points={visibleTicketsSoldPoints}
            window={ticketsWindow}
            control={
              <DropdownSelect
                value={ticketsWindow}
                ariaLabel="Tickets sold time range"
                options={[
                  { value: "full", label: "Full Cycle" },
                  { value: "24h", label: "Last 24h" },
                ]}
                onChange={(nextValue) => setTicketsWindow(nextValue as TimeWindow)}
                className="h-7 rounded-[var(--radius-surface)] border border-border bg-panel px-2.5 text-body-sm text-white/72 outline-none focus:border-[var(--accent-hex)]"
                optionClassName="text-body-sm"
              />
            }
          />
          <SummaryChart
            title="Ticket Velocity"
            valueLabel="Tickets per hour"
            points={visibleVelocityPoints}
            window={velocityWindow}
            control={
              <DropdownSelect
                value={velocityWindow}
                ariaLabel="Ticket velocity time range"
                options={[
                  { value: "full", label: "Full Cycle" },
                  { value: "24h", label: "Last 24h" },
                ]}
                onChange={(nextValue) => setVelocityWindow(nextValue as TimeWindow)}
                className="h-7 rounded-[var(--radius-surface)] border border-border bg-panel px-2.5 text-body-sm text-white/72 outline-none focus:border-[var(--accent-hex)]"
                optionClassName="text-body-sm"
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
