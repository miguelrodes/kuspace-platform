"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, DIALOG_ACTION_CLASS, DIALOG_FIELD_LABEL_CLASS, DIALOG_TITLE_CLASS } from "@/components/ui/action-dialog";
import { Input } from "@/components/ui/input";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { EditorSectionTitle } from "@/components/editor/editor-section-title";
import { TicketSummaryPanel } from "@/components/editor/ticket-summary-panel";
import { TicketTierCard, type TicketSectionDraft } from "@/components/editor/ticket-tier-card";
import type { EventStatus, TicketReleaseMode, TicketSection, TicketSectionVisibility, TicketTier, TicketTierStatus } from "@/types/event";
import type { AccessGroup } from "@/types/event";

export type TicketPhaseDraft = {
  id: string;
  name: string;
  price: string;
  quantityAvailable: string;
  quantitySold: string;
  status: TicketTierStatus;
  salesStart: string;
  salesEnd: string;
  releaseMode: TicketReleaseMode;
};

export type TicketSectionFormState = {
  id: string;
  name: string;
  visibility: TicketSectionVisibility;
  accessGroupId: string;
  allowedGroupIds: string[];
  phases: TicketPhaseDraft[];
};

export type TicketsFormState = {
  activeSectionId: string;
  sections: TicketSectionFormState[];
};

type TicketsTabProps = {
  value: TicketsFormState;
  eventStatus: EventStatus;
  accessGroups: AccessGroup[];
  onChange: (nextState: TicketsFormState) => void;
};

function createEmptyPhase(name = "Phase 1"): TicketPhaseDraft {
  return {
    id: `ticket-phase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    price: "",
    quantityAvailable: "",
    quantitySold: "0",
    status: "upcoming",
    salesStart: "",
    salesEnd: "",
    releaseMode: "manual",
  };
}

function normalizePhaseForEventStatus(
  phase: TicketPhaseDraft,
  eventStatus: EventStatus,
): TicketPhaseDraft {
  if (eventStatus === "draft" || eventStatus === "upcoming") {
    return {
      ...phase,
      quantitySold: "0",
      status: "upcoming",
    };
  }

  return phase;
}

function slugifyTicketSectionName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildSectionsFromAccessGroups(
  accessGroups: AccessGroup[],
): TicketSectionFormState[] {
  const defaultAccessGroupId = accessGroups[0]?.id ?? "";

  if (accessGroups.length === 0) {
    return [
      {
        id: "ticket-section-regular-entry",
        name: "Regular Entry",
        visibility: "public",
        accessGroupId: defaultAccessGroupId,
        allowedGroupIds: [],
        phases: [createEmptyPhase()],
      },
    ];
  }

  return accessGroups.map((accessGroup, index) => {
    const isGuestlistSection = accessGroup.name.trim().toLowerCase() === "guestlist";

    return {
      id: `ticket-section-${slugifyTicketSectionName(accessGroup.name) || index + 1}`,
      name: accessGroup.name,
      visibility: isGuestlistSection ? "restricted" : "public",
      accessGroupId: accessGroup.id,
      allowedGroupIds: isGuestlistSection ? [accessGroup.id] : [],
      phases: isGuestlistSection ? [] : [createEmptyPhase()],
    };
  });
}

function normalizeSectionVisibility(
  visibility: TicketSection["visibility"] | TicketSectionVisibility | "guestlist",
): TicketSectionVisibility {
  return visibility === "restricted" || visibility === "guestlist"
    ? "restricted"
    : visibility === "hidden"
      ? "hidden"
      : "public";
}

function inferAccessGroupId(sectionName: string, accessGroups: AccessGroup[]) {
  const normalizedSectionName = sectionName.trim().toLowerCase();

  return (
    accessGroups.find((group) => group.name.trim().toLowerCase() === normalizedSectionName)?.id ??
    accessGroups.find((group) => normalizedSectionName.includes(group.name.trim().toLowerCase()))?.id ??
    accessGroups[0]?.id ??
    ""
  );
}

function normalizeAllowedGroupIds(
  visibility: TicketSectionVisibility,
  allowedGroupIds: string[] | undefined,
  accessGroupId: string,
) {
  if (visibility !== "restricted") {
    return [];
  }

  const normalizedIds = (allowedGroupIds ?? []).filter(Boolean);
  if (normalizedIds.length > 0) {
    return normalizedIds;
  }

  return accessGroupId ? [accessGroupId] : [];
}

export function buildInitialTicketsState(event: {
  status: EventStatus;
  tickets: { tiers: TicketTier[]; sections?: TicketSection[] };
  guestlist: { accessGroups: AccessGroup[] };
}): TicketsFormState {
  if (event.tickets.sections?.length) {
    return {
      activeSectionId: event.tickets.sections[0].id,
      sections: event.tickets.sections.map((section) => {
        const visibility = normalizeSectionVisibility(section.visibility);
        const accessGroupId =
          section.accessGroupId || inferAccessGroupId(section.name, event.guestlist.accessGroups);

        return {
          id: section.id,
          name: section.name,
          visibility,
          accessGroupId,
          allowedGroupIds: normalizeAllowedGroupIds(
            visibility,
            section.allowedGroupIds,
            accessGroupId,
          ),
          phases: section.phases.map((phase) =>
            normalizePhaseForEventStatus(
              {
                id: phase.id,
                name: phase.name,
                price: String(phase.price),
                quantityAvailable: String(phase.quantityAvailable),
                quantitySold: String(phase.quantitySold ?? 0),
                status: phase.status,
                salesStart: phase.salesStart ?? "",
                salesEnd: phase.salesEnd ?? "",
                releaseMode: phase.releaseMode ?? "manual",
              },
              event.status,
            ),
          ),
        };
      }),
    };
  }

  const fallbackSections = buildSectionsFromAccessGroups(event.guestlist.accessGroups);
  const general = event.tickets.tiers.filter((tier) => !tier.name.toLowerCase().startsWith("vip"));
  const vip = event.tickets.tiers.filter((tier) => tier.name.toLowerCase().startsWith("vip"));

  if (event.tickets.tiers.length === 0) {
    return {
      activeSectionId: fallbackSections[0]?.id ?? "ticket-section-regular-entry",
      sections: fallbackSections,
    };
  }

  const tiersByFallbackSection = fallbackSections.map((section) => {
    const normalizedName = section.name.trim().toLowerCase();
    let matchingTiers = event.tickets.tiers.filter(
      (tier) => tier.name.trim().toLowerCase() === normalizedName,
    );

    if (matchingTiers.length === 0 && normalizedName.includes("vip")) {
      matchingTiers = vip;
    } else if (matchingTiers.length === 0 && (normalizedName.includes("regular") || normalizedName.includes("general"))) {
      matchingTiers = general;
    }

    return {
      ...section,
      phases:
        section.visibility === "restricted"
          ? []
          : matchingTiers.map((tier) =>
              normalizePhaseForEventStatus(
                {
                  id: tier.id,
                  name: tier.name,
                  price: String(tier.price),
                  quantityAvailable: String(tier.quantityAvailable),
                  quantitySold: String(tier.quantitySold ?? 0),
                  status: tier.status,
                  salesStart: "",
                  salesEnd: "",
                  releaseMode: (tier.releaseAfterTierId ? "after_previous_sold_out" : "manual") as TicketReleaseMode,
                },
                event.status,
              ),
            ),
    };
  });

  const sections: TicketSectionFormState[] = tiersByFallbackSection.filter(
    (section) => section.phases.length > 0 || section.visibility === "restricted",
  );

  return {
    activeSectionId: sections[0]?.id ?? fallbackSections[0]?.id ?? "ticket-section-general-admission",
    sections: sections.length > 0 ? sections : fallbackSections,
  };
}

function AddSectionDialog({
  name,
  visibility,
  accessGroupId,
  allowedGroupIds,
  accessGroups,
  onNameChange,
  onVisibilityChange,
  onAccessGroupChange,
  onAllowedGroupsChange,
  onClose,
  onConfirm,
}: {
  name: string;
  visibility: TicketSectionVisibility;
  accessGroupId: string;
  allowedGroupIds: string[];
  accessGroups: AccessGroup[];
  onNameChange: (nextValue: string) => void;
  onVisibilityChange: (nextValue: TicketSectionVisibility) => void;
  onAccessGroupChange: (nextValue: string) => void;
  onAllowedGroupsChange: (nextValue: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-[var(--radius-surface)] border border-border bg-panel px-5 pt-4 pb-3 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className={`${DIALOG_TITLE_CLASS} text-[#FFFFFF]`}>
          New Ticket Section
        </h3>

        <div className="mt-3 space-y-4">
          <div>
            <label className={`mb-1 block ${DIALOG_FIELD_LABEL_CLASS}`}>
              Title
            </label>
            <Input
              autoFocus
              value={name}
              placeholder="Section title"
              className="text-body text-white/72"
              onChange={(event) => onNameChange(event.target.value)}
            />
          </div>

          <div>
            <label className={`mb-1 block ${DIALOG_FIELD_LABEL_CLASS}`}>
              Availability
            </label>
            <DropdownSelect
              value={visibility}
              options={[
                { value: "public", label: "Public" },
                { value: "hidden", label: "Hidden" },
                { value: "restricted", label: "Restricted" },
              ]}
              onChange={onVisibilityChange}
              className="h-8 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 text-body text-white/72"
              menuClassName="w-full"
              optionClassName="text-body"
              ariaLabel="Ticket section availability"
            />
          </div>

          <div>
            <label className={`mb-1 block ${DIALOG_FIELD_LABEL_CLASS}`}>
              Access Group
            </label>
            <DropdownSelect
              value={accessGroupId}
              options={accessGroups.map((group) => ({ value: group.id, label: group.name }))}
              onChange={onAccessGroupChange}
              className="h-8 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 text-body text-white/72"
              menuClassName="w-full"
              optionClassName="text-body"
              ariaLabel="Ticket section access group"
            />
          </div>

          {visibility === "restricted" ? (
            <div>
            <label className={`mb-1 block ${DIALOG_FIELD_LABEL_CLASS}`}>
              Allowed Groups
            </label>
            <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-2">
              <div className="flex flex-wrap gap-2">
                  {accessGroups.map((group) => {
                    const isActive = allowedGroupIds.includes(group.id);

                    return (
                      <button
                        key={group.id}
                        type="button"
                        className={`rounded-[var(--radius-button-tag)] border px-2.5 py-1 text-body-sm transition ${
                          isActive
                            ? "border-[var(--accent-hex)] text-fg"
                            : "border-border text-muted hover:text-fg"
                        }`}
                        onClick={() => {
                          onAllowedGroupsChange(
                            isActive
                              ? allowedGroupIds.filter((groupId) => groupId !== group.id)
                              : [...allowedGroupIds, group.id],
                          );
                        }}
                      >
                        {group.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            className={DIALOG_ACTION_CLASS}
            style={{ color: "var(--accent-hex)" }}
            disabled={!name.trim()}
            onClick={onConfirm}
          >
            Add Section
          </Button>
        </div>
      </div>
    </div>
  );
}

export function createEmptyTicketsState(accessGroups: AccessGroup[] = []): TicketsFormState {
  const sections = buildSectionsFromAccessGroups(accessGroups);

  return {
    activeSectionId: sections[0]?.id ?? "ticket-section-general-admission",
    sections,
  };
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildEventTicketsPatch(value: TicketsFormState, eventStatus: EventStatus) {
  const flattenedTiers: TicketTier[] = value.sections.flatMap((section) =>
    section.phases.map((phase, index) => {
      const normalizedPhase = normalizePhaseForEventStatus(phase, eventStatus);

      return {
        id: normalizedPhase.id,
        name: normalizedPhase.name,
        price: parseNumber(normalizedPhase.price),
        quantityAvailable: parseNumber(normalizedPhase.quantityAvailable),
        quantitySold: parseNumber(normalizedPhase.quantitySold),
        visibility: section.visibility === "hidden" ? "hidden" : "public",
        status: normalizedPhase.status,
        sortOrder: index,
        releaseAfterTierId:
          normalizedPhase.releaseMode === "after_previous_sold_out" && index > 0
            ? section.phases[index - 1].id
            : undefined,
      };
    }),
  );

  return {
    tiers: flattenedTiers,
    sections: value.sections.map((section) => ({
      id: section.id,
      name: section.name,
      visibility: section.visibility,
      accessGroupId: section.accessGroupId,
      allowedGroupIds: section.allowedGroupIds,
      phases: section.phases.map((phase, index) => {
        const normalizedPhase = normalizePhaseForEventStatus(phase, eventStatus);

        return {
          id: normalizedPhase.id,
          name: normalizedPhase.name,
          price: parseNumber(normalizedPhase.price),
          quantityAvailable: parseNumber(normalizedPhase.quantityAvailable),
          quantitySold: parseNumber(normalizedPhase.quantitySold),
          visibility: (section.visibility === "hidden" ? "hidden" : "public") as "hidden" | "public",
          status: normalizedPhase.status,
          sortOrder: index,
          salesStart: normalizedPhase.salesStart || undefined,
          salesEnd: normalizedPhase.salesEnd || undefined,
          releaseMode: normalizedPhase.releaseMode,
          releaseAfterTierId:
            normalizedPhase.releaseMode === "after_previous_sold_out" && index > 0
              ? section.phases[index - 1].id
              : undefined,
        };
      }),
    })),
  };
}

export function TicketsTab({ value, eventStatus, accessGroups, onChange }: TicketsTabProps) {
  const [view, setView] = useState<"sections" | "overview">("sections");
  const [sectionPendingDelete, setSectionPendingDelete] = useState<TicketSectionFormState | null>(null);
  const [showAddSectionDialog, setShowAddSectionDialog] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionVisibility, setNewSectionVisibility] = useState<TicketSectionVisibility>("public");
  const [newSectionAccessGroupId, setNewSectionAccessGroupId] = useState(accessGroups[0]?.id ?? "");
  const [newSectionAllowedGroupIds, setNewSectionAllowedGroupIds] = useState<string[]>([]);
  const activeSection =
    value.sections.find((section) => section.id === value.activeSectionId) ?? value.sections[0];

  const activeSectionHasSales = activeSection
    ? activeSection.phases.some((phase) => parseNumber(phase.quantitySold) > 0)
    : false;

  const canEditSectionMeta = eventStatus !== "past";
  const canAddPhase = eventStatus !== "past";
  const canDeleteSection =
    eventStatus !== "past" &&
    value.sections.length > 1 &&
    !(eventStatus === "live" && activeSectionHasSales);
  const sectionOptions = value.sections.map((section) => ({
    value: section.id,
    label: section.name,
  }));
  const homeDropdownTriggerClassName =
    "h-7 w-full justify-between gap-1.5 rounded-[var(--radius-button-tag)] bg-transparent px-2.5 py-0 text-body-sm uppercase tracking-widerish text-fg transition hover:opacity-80 disabled:cursor-not-allowed disabled:text-muted";
  const homeDropdownOptionClassName =
    "flex w-full justify-end px-2 py-1 text-body-xs uppercase tracking-widerish text-right";

  return (
    <section className="w-full max-w-full min-w-0 overflow-hidden rounded-[var(--radius-surface)] border border-border bg-panel p-5">
      <div className="w-full max-w-full min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <EditorSectionTitle>Tickets</EditorSectionTitle>
          <div className="-mr-3 ml-auto flex-1 text-right">
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-full justify-end px-0 text-right text-body-sm uppercase tracking-[0.12em]"
              style={{ color: "var(--accent-hex)" }}
              onClick={() => {
                setNewSectionName("");
                setNewSectionVisibility("public");
                setNewSectionAccessGroupId(accessGroups[0]?.id ?? "");
                setNewSectionAllowedGroupIds([]);
                setShowAddSectionDialog(true);
              }}
              disabled={eventStatus === "past"}
            >
              Add Section
            </Button>
          </div>
        </div>

        <div className="mb-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className={`inline-flex h-7 items-center text-body uppercase tracking-widerish transition ${
                view === "sections" ? "text-[#FFFFFF]" : "text-muted"
              }`}
              onClick={() => setView("sections")}
            >
              Sections
            </button>
            <span className="h-4 w-px bg-[#FFFFFF]" aria-hidden="true" />
            <button
              type="button"
              className={`inline-flex h-7 items-center text-body uppercase tracking-widerish transition ${
                view === "overview" ? "text-[#FFFFFF]" : "text-muted"
              }`}
              onClick={() => setView("overview")}
            >
              Overview
            </button>
          </div>

          {view === "sections" && activeSection ? (
            <div className="ml-auto w-full max-w-[10rem]">
              <DropdownSelect
                value={activeSection.id}
                options={sectionOptions}
                className={homeDropdownTriggerClassName}
                labelClassName="block w-full text-right"
                optionClassName={homeDropdownOptionClassName}
                disabled={value.sections.length <= 1}
                onChange={(sectionId) =>
                  onChange({
                    ...value,
                    activeSectionId: sectionId,
                  })
                }
              />
            </div>
          ) : null}
        </div>

        {view === "sections" && activeSection ? (
          <TicketTierCard
            value={activeSection as TicketSectionDraft}
            accessGroups={accessGroups}
            editableSection={canEditSectionMeta}
            canDeleteSection={canDeleteSection}
            canAddPhase={canAddPhase}
            onChange={(nextSection) =>
              onChange({
                ...value,
                sections: value.sections.map((section) =>
                  section.id === activeSection.id ? nextSection : section,
                ),
              })
            }
            onRemoveSection={() => {
              if (!canDeleteSection) {
                return;
              }
              setSectionPendingDelete(activeSection);
            }}
            onAddPhase={(nextPhase) => {
              onChange({
                ...value,
                sections: value.sections.map((section) =>
                  section.id === activeSection.id
                    ? {
                        ...section,
                        phases: [...section.phases, nextPhase],
                      }
                    : section,
                ),
              });
            }}
          />
        ) : null}

        {view === "overview" ? (
          <TicketSummaryPanel sections={value.sections as TicketSectionDraft[]} />
        ) : null}
      </div>

      {sectionPendingDelete ? (
        <ConfirmDialog
          title="Delete Ticket Section"
          message={
            sectionPendingDelete.phases.length > 0
              ? `Delete "${sectionPendingDelete.name}"?\n\nThis will also delete ${sectionPendingDelete.phases.length} ticket phase${sectionPendingDelete.phases.length === 1 ? "" : "s"} in this section.`
              : `Delete "${sectionPendingDelete.name}"?`
          }
          confirmLabel="Delete Section"
          confirmTone="warning"
          hideClose
          onClose={() => setSectionPendingDelete(null)}
          onConfirm={() => {
            const remainingSections = value.sections.filter((section) => section.id !== sectionPendingDelete.id);
            onChange({
              activeSectionId: remainingSections[0]?.id ?? value.activeSectionId,
              sections: remainingSections,
            });
            setSectionPendingDelete(null);
          }}
        />
      ) : null}

      {showAddSectionDialog ? (
        <AddSectionDialog
          name={newSectionName}
          visibility={newSectionVisibility}
          accessGroupId={newSectionAccessGroupId}
          allowedGroupIds={newSectionAllowedGroupIds}
          accessGroups={accessGroups}
          onNameChange={setNewSectionName}
          onVisibilityChange={(nextVisibility) => {
            setNewSectionVisibility(nextVisibility);
            if (nextVisibility !== "restricted") {
              setNewSectionAllowedGroupIds([]);
              return;
            }

            setNewSectionAllowedGroupIds((current) =>
              current.length > 0 ? current : newSectionAccessGroupId ? [newSectionAccessGroupId] : [],
            );
          }}
          onAccessGroupChange={(nextAccessGroupId) => {
            setNewSectionAccessGroupId(nextAccessGroupId);
            setNewSectionAllowedGroupIds((current) =>
              newSectionVisibility === "restricted" && current.length === 0
                ? [nextAccessGroupId]
                : current,
            );
          }}
          onAllowedGroupsChange={setNewSectionAllowedGroupIds}
          onClose={() => {
            setShowAddSectionDialog(false);
            setNewSectionName("");
            setNewSectionVisibility("public");
            setNewSectionAccessGroupId(accessGroups[0]?.id ?? "");
            setNewSectionAllowedGroupIds([]);
          }}
          onConfirm={() => {
            const trimmedName = newSectionName.trim();

            if (!trimmedName) {
              return;
            }

            const nextSection: TicketSectionFormState = {
              id: `ticket-section-${Date.now()}`,
              name: trimmedName,
              visibility: newSectionVisibility,
              accessGroupId: newSectionAccessGroupId,
              allowedGroupIds:
                newSectionVisibility === "restricted" ? newSectionAllowedGroupIds : [],
              phases: newSectionVisibility === "restricted" ? [] : [createEmptyPhase()],
            };

            onChange({
              activeSectionId: nextSection.id,
              sections: [...value.sections, nextSection],
            });
            setShowAddSectionDialog(false);
            setNewSectionName("");
            setNewSectionVisibility("public");
            setNewSectionAccessGroupId(accessGroups[0]?.id ?? "");
            setNewSectionAllowedGroupIds([]);
          }}
        />
      ) : null}
    </section>
  );
}
