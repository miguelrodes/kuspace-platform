"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { ReleasePhaseRow, type TicketPhaseDraft } from "@/components/editor/release-phase-row";
import type { AccessGroup, TicketSectionVisibility } from "@/types/event";

export type TicketSectionDraft = {
  id: string;
  name: string;
  visibility: TicketSectionVisibility;
  accessGroupId: string;
  allowedGroupIds: string[];
  phases: TicketPhaseDraft[];
};

type TicketTierCardProps = {
  value: TicketSectionDraft;
  accessGroups: AccessGroup[];
  editableSection: boolean;
  canDeleteSection: boolean;
  canAddPhase: boolean;
  onChange: (nextValue: TicketSectionDraft) => void;
  onRemoveSection: () => void;
  onAddPhase: (phase: TicketPhaseDraft) => void;
};

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

function computeTicketsPerHour(
  sold: number,
  salesStart?: string,
  salesEnd?: string,
) {
  if (sold <= 0 || !salesStart) {
    return 0;
  }

  const start = new Date(salesStart);
  const end = salesEnd ? new Date(salesEnd) : new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 0;
  }

  const hours = Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60), 1);
  return Number((sold / hours).toFixed(1));
}

function formatTicketsPerHour(value: number) {
  return `${value.toFixed(1)} T/h`;
}

function phaseStatusLabel(status: TicketPhaseDraft["status"]) {
  if (status === "sold_out") return "Sold Out";
  if (status === "upcoming") return "Upcoming";
  return "Live";
}

function SectionActionMenu({
  canDelete,
  onDelete,
}: {
  canDelete: boolean;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (!canDelete) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Open section actions"
        className="flex h-7 w-7 items-center justify-center rounded-sm text-[1rem] leading-none text-muted transition hover:text-fg"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="-mt-[1px] block leading-none">⋯</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-10 mt-1 min-w-[7.5rem] rounded-[var(--radius-surface)] border border-border bg-panel p-0.5 shadow-xl">
          <button
            type="button"
            className="block w-full rounded-sm px-2 py-0.5 text-center text-body-sm text-[var(--accent-hex)] transition hover:bg-panel-2"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
            Delete Section
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PhaseActionMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Open phase actions"
        className="flex h-6 w-6 items-center justify-center rounded-sm transition hover:opacity-80"
        style={{ color: "var(--accent-hex)" }}
        onClick={() => setOpen((current) => !current)}
      >
        <svg aria-hidden="true" viewBox="0 0 8 20" className="h-4 w-2 fill-current">
          <circle cx="4" cy="3" r="1.6" />
          <circle cx="4" cy="10" r="1.6" />
          <circle cx="4" cy="17" r="1.6" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-10 mt-1 min-w-[7.5rem] rounded-[var(--radius-surface)] border border-border bg-panel p-0.5 shadow-xl">
          <button
            type="button"
            className="block w-full rounded-sm px-2 py-0.5 text-center text-body-sm text-[var(--accent-hex)] transition hover:bg-panel-2"
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
          >
            Edit Phase
          </button>
          <button
            type="button"
            className="mt-0.5 block w-full rounded-sm px-2 py-0.5 text-center text-body-sm text-[hsl(var(--warning))] transition hover:bg-panel-2"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
            Delete Phase
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function TicketTierCard({
  value,
  accessGroups,
  editableSection,
  canDeleteSection,
  canAddPhase,
  onChange,
  onRemoveSection,
  onAddPhase,
}: TicketTierCardProps) {
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [draftPhase, setDraftPhase] = useState<TicketPhaseDraft | null>(null);
  const [phasePendingDeleteId, setPhasePendingDeleteId] = useState<string | null>(null);
  const totalCapacity = value.phases.reduce((sum, phase) => sum + parseNumber(phase.quantityAvailable), 0);
  const totalSold = value.phases.reduce((sum, phase) => sum + parseNumber(phase.quantitySold), 0);
  const revenueEarned = value.phases.reduce(
    (sum, phase) => sum + parseNumber(phase.price) * parseNumber(phase.quantitySold),
    0,
  );
  const percentSold = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;
  const sectionVelocityValues = value.phases
    .map((phase) =>
      computeTicketsPerHour(
        parseNumber(phase.quantitySold),
        phase.salesStart,
        phase.salesEnd,
      ),
    )
    .filter((velocity) => velocity > 0);
  const sectionAverageVelocity = sectionVelocityValues.length
    ? Number(
        (
          sectionVelocityValues.reduce((sum, velocity) => sum + velocity, 0) /
          sectionVelocityValues.length
        ).toFixed(1),
      )
    : 0;
  const activePhase = useMemo(
    () => value.phases.find((phase) => phase.id === activePhaseId) ?? null,
    [activePhaseId, value.phases],
  );
  const phasePendingDelete = useMemo(
    () => value.phases.find((phase) => phase.id === phasePendingDeleteId) ?? null,
    [phasePendingDeleteId, value.phases],
  );
  const phaseInEditor = activePhase ?? draftPhase;
  const availabilityOptions = [
    { value: "public", label: "Public" },
    { value: "hidden", label: "Hidden" },
    { value: "restricted", label: "Restricted" },
  ];
  const accessGroupOptions = accessGroups.map((group) => ({
    value: group.id,
    label: group.name,
  }));

  return (
    <section className="w-full max-w-full min-w-0 overflow-hidden rounded-[var(--radius-surface)] border border-border bg-panel px-4 pt-1 pb-4">
      <div className="w-full max-w-full min-w-0 space-y-3">
        {!editableSection ? (
          <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-2 text-body-sm text-[#facc15]">
            Ticket section settings are read-only for this event status.
          </div>
        ) : null}

        <div className="relative h-0">
          <div className="absolute right-0 top-0">
          <SectionActionMenu canDelete={canDeleteSection} onDelete={onRemoveSection} />
          </div>
        </div>

        <div className="max-w-[18rem] pb-2">
          <label className="text-body uppercase tracking-widerish text-fg">Section Name</label>
          <Input
            value={value.name}
            className="mt-1 !h-7 !bg-panel py-0.5 text-body-sm text-white/72 disabled:cursor-not-allowed disabled:text-muted"
            disabled={!editableSection}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
          />
        </div>

        <div
          className={`grid gap-6 pb-3 lg:items-start ${
            value.visibility === "restricted"
              ? "lg:grid-cols-[9rem_minmax(0,12rem)_minmax(0,1fr)]"
              : "lg:grid-cols-[9rem_minmax(0,12rem)]"
          }`}
        >
          <div className="min-w-0 lg:w-36">
            <label className="text-body uppercase tracking-widerish text-fg">Availability</label>
            <DropdownSelect
              value={value.visibility}
              options={availabilityOptions}
              className="mt-1 h-7 w-full rounded-[var(--radius-surface)] border border-border !bg-panel px-2.5 text-body-sm text-white/72 outline-none focus:border-[var(--accent-hex)] disabled:cursor-not-allowed disabled:text-muted"
              optionClassName="text-body-sm"
              disabled={!editableSection}
              onChange={(nextValue) =>
                onChange({
                  ...value,
                  visibility: nextValue as TicketSectionVisibility,
                  allowedGroupIds:
                    nextValue === "restricted"
                      ? value.allowedGroupIds.length > 0
                        ? value.allowedGroupIds
                        : value.accessGroupId
                          ? [value.accessGroupId]
                          : []
                      : [],
                })
              }
            />
          </div>
          <div className="min-w-0">
            <label className="text-body uppercase tracking-widerish text-fg">Access Group</label>
            <DropdownSelect
              value={value.accessGroupId}
              options={accessGroupOptions}
              className="mt-1 h-7 w-full rounded-[var(--radius-surface)] border border-border !bg-panel px-2.5 text-body-sm text-white/72 outline-none focus:border-[var(--accent-hex)] disabled:cursor-not-allowed disabled:text-muted"
              optionClassName="text-body-sm"
              disabled={!editableSection || accessGroupOptions.length === 0}
              onChange={(nextValue) =>
                onChange({
                  ...value,
                  accessGroupId: nextValue,
                  allowedGroupIds:
                    value.visibility === "restricted" && value.allowedGroupIds.length === 0
                      ? [nextValue]
                      : value.allowedGroupIds,
                })
              }
            />
          </div>

          {value.visibility === "restricted" ? (
            <div className="min-w-0 lg:min-w-[18rem]">
              <label className="text-body uppercase tracking-widerish text-fg">Allowed Groups</label>
              <div className="mt-1 flex h-7 items-center rounded-[var(--radius-surface)] border border-border bg-panel px-2.5">
                {accessGroups.length === 0 ? (
                  <p className="truncate text-body-sm text-muted">No access groups available.</p>
                ) : (
                  <div className="min-w-0 overflow-x-auto whitespace-nowrap">
                    <div className="inline-flex items-center text-body-sm">
                      {accessGroups.map((group) => {
                        const isActive = value.allowedGroupIds.includes(group.id);
                        return (
                          <span key={group.id} className="inline-flex items-center">
                            <button
                              type="button"
                              className={`text-body-sm transition ${
                                isActive ? "text-fg" : "text-muted hover:text-fg"
                              }`}
                              disabled={!editableSection}
                              onClick={() => {
                                const nextAllowedGroupIds = isActive
                                  ? value.allowedGroupIds.filter((groupId) => groupId !== group.id)
                                  : [...value.allowedGroupIds, group.id];

                                onChange({
                                  ...value,
                                  allowedGroupIds: nextAllowedGroupIds,
                                });
                              }}
                            >
                              {group.name}
                            </button>
                            {group !== accessGroups[accessGroups.length - 1] ? (
                              <span className="px-3 text-muted">|</span>
                            ) : null}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 pb-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-1.5">
            <p className="text-body-sm uppercase tracking-widerish text-muted">Capacity</p>
            <p className="mt-1 text-body text-fg">{totalCapacity}</p>
          </div>
          <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-1.5">
            <p className="text-body-sm uppercase tracking-widerish text-muted">Revenue Earned</p>
            <p className="mt-1 text-body text-fg">{formatCurrency(revenueEarned)}</p>
          </div>
          <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-1.5">
            <p className="text-body-sm uppercase tracking-widerish text-muted">Ticket Velocity</p>
            <p className="mt-1 text-body text-fg">{formatTicketsPerHour(sectionAverageVelocity)}</p>
          </div>
          <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-1.5">
            <p className="text-body-sm uppercase tracking-widerish text-muted">% Sold</p>
            <p className="mt-1 text-body text-fg">{percentSold}%</p>
          </div>
        </div>

        <div className="min-w-0 space-y-2 pt-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-body uppercase tracking-widerish text-fg">Timeline</p>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-4 text-body-sm uppercase tracking-[0.12em]"
              style={{ color: "var(--accent-hex)" }}
              onClick={() => {
                setDraftPhase({
                  id:
                    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                      ? crypto.randomUUID()
                      : `phase-${Date.now()}`,
                  name: `Phase ${value.phases.length + 1}`,
                  price: "",
                  quantityAvailable: "",
                  quantitySold: "",
                  status: "upcoming",
                  salesStart: "",
                  salesEnd: "",
                  releaseMode: "manual",
                });
              }}
              disabled={!canAddPhase}
            >
              Add Phase
            </Button>
          </div>
          <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2">
            <div className="flex min-w-max gap-3">
              {value.phases.map((phase) => {
                const phaseVelocity =
                  phase.status === "upcoming"
                    ? 0
                    : phase.status === "sold_out"
                      ? sectionAverageVelocity
                      : computeTicketsPerHour(
                          parseNumber(phase.quantitySold),
                          phase.salesStart,
                          phase.salesEnd,
                        );

                return (
                  <div
                    key={phase.id}
                    className={`w-[14.75rem] shrink-0 rounded-[var(--radius-surface)] border border-border bg-panel p-4 ${
                      phase.status === "sold_out" ? "opacity-80" : ""
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
                        <div className="min-w-0">
                          <p className="truncate text-body uppercase tracking-[0.02em] text-fg">
                            {phase.name || "Untitled Phase"}
                          </p>
                        </div>
                        <div className="-mr-1 flex items-center">
                          <PhaseActionMenu
                            onEdit={() => setActivePhaseId(phase.id)}
                            onDelete={() => setPhasePendingDeleteId(phase.id)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="text-body text-muted">Price</p>
                          <p className="text-body text-fg">{formatCurrency(parseNumber(phase.price))}</p>
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="text-body text-muted">Quantity</p>
                          <p className="text-body text-fg">{parseNumber(phase.quantityAvailable)}</p>
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="text-body text-muted">Sold</p>
                          <p className="text-body text-fg">
                            {parseNumber(phase.quantityAvailable) > 0
                              ? Math.round(
                                  (parseNumber(phase.quantitySold) /
                                    parseNumber(phase.quantityAvailable)) *
                                    100,
                                )
                              : 0}
                            %
                          </p>
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="text-body text-muted">Velocity</p>
                          <p className="text-body text-fg">{formatTicketsPerHour(phaseVelocity)}</p>
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="text-body text-muted">Status</p>
                          <p className="text-body text-fg">{phaseStatusLabel(phase.status)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {phaseInEditor ? (
        <ReleasePhaseRow
          open
          value={phaseInEditor}
          disabled={!editableSection}
          onClose={() => {
            if (draftPhase) {
              setDraftPhase(null);
              return;
            }
            setActivePhaseId(null);
          }}
          onChange={(nextPhase) => {
            if (draftPhase) {
              setDraftPhase(nextPhase);
              return;
            }
            onChange({
              ...value,
              phases: value.phases.map((current) =>
                current.id === phaseInEditor.id ? nextPhase : current,
              ),
            });
          }}
          onDone={(nextPhase) => {
            if (!draftPhase) {
              return;
            }
            onAddPhase(nextPhase);
          }}
        />
      ) : null}

      {phasePendingDelete ? (
        <ConfirmDialog
          title="Delete Ticket Phase"
          message={`Delete "${phasePendingDelete.name || "Untitled Phase"}"? This cannot be undone.`}
          confirmLabel="Delete Phase"
          confirmTone="warning"
          onClose={() => setPhasePendingDeleteId(null)}
          onConfirm={() => {
            onChange({
              ...value,
              phases: value.phases.filter((phase) => phase.id !== phasePendingDelete.id),
            });
            if (activePhaseId === phasePendingDelete.id) {
              setActivePhaseId(null);
            }
            setPhasePendingDeleteId(null);
          }}
        />
      ) : null}
    </section>
  );
}
