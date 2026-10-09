"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, DIALOG_ACTION_CLASS, DIALOG_FIELD_LABEL_CLASS, DIALOG_TITLE_CLASS, PromptDialog } from "@/components/ui/action-dialog";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { EditorSectionHeader } from "@/components/editor/editor-section-header";
import type { AccessGroup, EventApplication, GuestlistEntry } from "@/types/event";
import type { ConsumerUser } from "@/types/user";

export type GuestlistSort = "default" | "a-z" | "z-a" | "recent";

export type GuestlistFormState = {
  accessGroups: AccessGroup[];
  entries: GuestlistEntry[];
  searchQuery: string;
  sort: GuestlistSort;
};

type GuestlistTabProps = {
  eventId: string;
  admissionMode: "public" | "curated";
  value: GuestlistFormState;
  applications: EventApplication[];
  users: ConsumerUser[];
  onChange: (nextState: GuestlistFormState) => void;
  onApproveApplication: (userId: string, accessGroupId: string) => void;
  onDenyApplication: (userId: string) => void;
};

type ManualGuestDraft = {
  firstName: string;
  lastName: string;
  username: string;
};

function getEntryDisplayName(
  entry: GuestlistEntry,
  usersById: Map<string, ConsumerUser>,
) {
  if (entry.source === "user") {
    const user = usersById.get(entry.userId);
    return user ? `${user.firstName} ${user.lastName}` : entry.userId;
  }

  return `${entry.firstName} ${entry.lastName}`.trim();
}

function getEntrySearchText(
  entry: GuestlistEntry,
  usersById: Map<string, ConsumerUser>,
) {
  if (entry.source === "user") {
    const user = usersById.get(entry.userId);
    return [user?.firstName, user?.lastName, user?.id, user?.username].filter(Boolean).join(" ").toLowerCase();
  }

  return [entry.firstName, entry.lastName, entry.userId].filter(Boolean).join(" ").toLowerCase();
}

function sortEntries(
  entries: GuestlistEntry[],
  usersById: Map<string, ConsumerUser>,
  sort: GuestlistSort,
) {
  const nextEntries = [...entries];

  if (sort === "default") {
    return nextEntries;
  }

  if (sort === "recent") {
    return nextEntries.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  const factor = sort === "z-a" ? -1 : 1;

  return nextEntries.sort(
    (a, b) =>
      factor *
      getEntryDisplayName(a, usersById).localeCompare(
        getEntryDisplayName(b, usersById),
      ),
  );
}

function createManualGuest(accessGroupId: string, draft: ManualGuestDraft): GuestlistEntry {
  return {
    id: `guest-manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: "manual",
    accessGroupId,
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    userId: draft.username.trim() || undefined,
    checkedIn: false,
    createdAt: new Date().toISOString(),
  };
}

function AddGuestModal({
  accessGroups,
  entries,
  onClose,
  onConfirm,
}: {
  accessGroups: AccessGroup[];
  entries: GuestlistEntry[];
  onClose: () => void;
  onConfirm: (accessGroupId: string, draft: ManualGuestDraft) => void;
}) {
  const [selectedAccessGroupId, setSelectedAccessGroupId] = useState(accessGroups[0]?.id ?? "");
  const [draft, setDraft] = useState<ManualGuestDraft>({
    firstName: "",
    lastName: "",
    username: "",
  });
  const [firstNameWarning, setFirstNameWarning] = useState("");
  const [lastNameWarning, setLastNameWarning] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");

  const groupOptions = accessGroups.map((group) => ({ value: group.id, label: group.name }));

  const handleSubmit = () => {
    const firstName = draft.firstName.trim();
    const lastName = draft.lastName.trim();

    setFirstNameWarning(firstName ? "" : "First name is required.");
    setLastNameWarning(lastName ? "" : "Last name is required.");
    setDuplicateWarning("");

    if (!firstName || !lastName) {
      return;
    }

    const hasDuplicateManualGuest = entries.some((entry) => {
      if (entry.source !== "manual" || entry.userId) {
        return false;
      }

      return (
        entry.firstName.trim().toLowerCase() === firstName.toLowerCase() &&
        entry.lastName.trim().toLowerCase() === lastName.toLowerCase()
      );
    });

    if (hasDuplicateManualGuest) {
      setDuplicateWarning("A manually added attendee with the same first and last name already exists.");
      return;
    }

    setFirstNameWarning("");
    setLastNameWarning("");
    setDuplicateWarning("");
    onConfirm(selectedAccessGroupId, draft);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-[var(--radius-surface)] border border-border bg-panel p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className={`${DIALOG_TITLE_CLASS} text-[#FFFFFF]`}>
            Add Attendee
          </h3>
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-body-sm text-muted">Use fictional details only. One-click demo edits stay in your tab; separate signed-in workspace edits may be shared.</p>
          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>First Name</label>
            <Input
              value={draft.firstName}
              placeholder="First name"
              className="mt-1 text-body text-white/72"
              onChange={(event) => {
                setFirstNameWarning("");
                setDuplicateWarning("");
                setDraft((current) => ({ ...current, firstName: event.target.value }));
              }}
            />
            {firstNameWarning ? (
              <p className="mt-1 text-body-sm text-[hsl(var(--warning))]">{firstNameWarning}</p>
            ) : null}
          </div>

          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>Last Name</label>
            <Input
              value={draft.lastName}
              placeholder="Last name"
              className="mt-1 text-body text-white/72"
              onChange={(event) => {
                setLastNameWarning("");
                setDuplicateWarning("");
                setDraft((current) => ({ ...current, lastName: event.target.value }));
              }}
            />
            {lastNameWarning || duplicateWarning ? (
              <p className="mt-1 text-body-sm text-[hsl(var(--warning))]">
                {lastNameWarning || duplicateWarning}
              </p>
            ) : null}
          </div>

          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>Username</label>
            <Input
              value={draft.username}
              placeholder="Optional username to link this attendee"
              className="mt-1 text-body text-white/72"
              onChange={(event) => {
                setDuplicateWarning("");
                setDraft((current) => ({ ...current, username: event.target.value }));
              }}
            />
          </div>

          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>Access Group</label>
            <DropdownSelect
              value={selectedAccessGroupId}
              options={groupOptions}
              className="mt-1 h-8 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 text-body text-white/72 outline-none focus:border-[var(--accent-hex)]"
              optionClassName="text-body"
              onChange={(nextValue) => {
                setSelectedAccessGroupId(nextValue);
              }}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            variant="subtle"
            className={DIALOG_ACTION_CLASS}
            style={{ color: "var(--accent-hex)" }}
            onClick={handleSubmit}
          >
            Add Attendee
          </Button>
        </div>
      </div>
    </div>
  );
}

function RowActionMenu({
  entry,
  accessGroups,
  onMove,
  onDelete,
}: {
  entry: GuestlistEntry;
  accessGroups: AccessGroup[];
  onMove: (entryId: string, accessGroupId: string) => void;
  onDelete: (entryId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Open attendee actions"
        className="flex h-6 w-6 items-center justify-center self-center rounded-sm text-[1rem] leading-none text-muted transition hover:text-fg"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="-mt-[1px] block leading-none">⋯</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-10 mt-1 min-w-40 rounded-[var(--radius-surface)] border border-border bg-panel p-1 shadow-xl">
          {accessGroups
            .filter((group) => group.id !== entry.accessGroupId)
            .map((group) => (
              <button
                key={group.id}
                type="button"
                className="block w-full rounded-sm px-3 py-2 text-left text-body text-fg transition hover:bg-panel-2"
                onClick={() => {
                  onMove(entry.id, group.id);
                  setOpen(false);
                }}
              >
                Move to {group.name}
              </button>
            ))}
          <button
            type="button"
            className="block w-full rounded-sm px-3 py-2 text-left text-body text-[var(--accent-hex)] transition hover:bg-panel-2"
            onClick={() => {
              onDelete(entry.id);
              setOpen(false);
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

function GroupActionMenu({
  group,
  canDelete,
  onDelete,
}: {
  group: AccessGroup;
  canDelete: boolean;
  onDelete: (group: AccessGroup) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!canDelete) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Open ${group.name} actions`}
        className="flex h-6 w-6 items-center justify-center rounded-sm text-[1rem] leading-none text-muted transition hover:text-fg"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="-mt-[1px] block leading-none">⋯</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-10 mt-1 min-w-40 rounded-[var(--radius-surface)] border border-border bg-panel p-1 shadow-xl">
          <button
            type="button"
            className="block w-full rounded-sm px-3 py-2 text-left text-body text-[var(--accent-hex)] transition hover:bg-panel-2"
            onClick={() => {
              onDelete(group);
              setOpen(false);
            }}
          >
            Delete Group
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function GuestlistTab({
  eventId,
  admissionMode,
  value,
  applications,
  users,
  onChange,
  onApproveApplication,
  onDenyApplication,
}: GuestlistTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupPendingDelete, setGroupPendingDelete] = useState<AccessGroup | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [pendingApplicationGroups, setPendingApplicationGroups] = useState<Record<string, string>>({});
  const regularGroupId =
    value.accessGroups.find((group) => group.id === "group-regular-entry")?.id ??
    value.accessGroups.find((group) => group.name.toLowerCase() === "regular entry")?.id ??
    value.accessGroups[0]?.id;

  const totalAttendees = value.entries.length;
  const pendingApplications = useMemo(
    () => applications.filter((application) => application.status === "pending"),
    [applications],
  );
  const usersById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const visibleEntries = useMemo(() => {
    const query = value.searchQuery.trim().toLowerCase();
    const filtered = query
      ? value.entries.filter((entry) =>
          getEntrySearchText(entry, usersById).includes(query),
        )
      : value.entries;

    return sortEntries(filtered, usersById, value.sort);
  }, [usersById, value.entries, value.searchQuery, value.sort]);

  const { entriesByGroup, groupTotals } = useMemo(() => {
    const visibleMap = new Map<string, GuestlistEntry[]>();
    const totalsMap = new Map<string, number>();

    value.accessGroups.forEach((group) => {
      visibleMap.set(group.id, []);
      totalsMap.set(group.id, 0);
    });

    value.entries.forEach((entry) => {
      totalsMap.set(entry.accessGroupId, (totalsMap.get(entry.accessGroupId) ?? 0) + 1);
    });

    visibleEntries.forEach((entry) => {
      const entries = visibleMap.get(entry.accessGroupId);

      if (entries) {
        entries.push(entry);
        return;
      }

      visibleMap.set(entry.accessGroupId, [entry]);
    });

    return {
      entriesByGroup: visibleMap,
      groupTotals: totalsMap,
    };
  }, [value.accessGroups, value.entries, visibleEntries]);

  const handleMove = (entryId: string, accessGroupId: string) => {
    onChange({
      ...value,
      entries: value.entries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              accessGroupId,
            }
          : entry,
      ),
    });
  };

  const handleDelete = (entryId: string) => {
    onChange({
      ...value,
      entries: value.entries.filter((entry) => entry.id !== entryId),
    });
  };

  const handleAddGuest = (accessGroupId: string, draft: ManualGuestDraft) => {
    onChange({
      ...value,
      entries: [...value.entries, createManualGuest(accessGroupId, draft)],
    });
    setShowAddModal(false);
  };

  const handleAddGroup = () => {
    const trimmedName = newGroupName.trim();

    if (!trimmedName) {
      return;
    }

    const nextId = `group-${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;

    if (value.accessGroups.some((group) => group.id === nextId || group.name.toLowerCase() === trimmedName.toLowerCase())) {
      setShowAddGroupModal(false);
      setNewGroupName("");
      return;
    }

    onChange({
      ...value,
      accessGroups: [...value.accessGroups, { id: nextId, name: trimmedName }],
    });

    setShowAddGroupModal(false);
    setNewGroupName("");
  };

  const toggleGroupCollapsed = (groupId: string) => {
    setCollapsedGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  };

  const handleDeleteGroup = (group: AccessGroup) => {
    if (!regularGroupId || group.id === regularGroupId) {
      return;
    }

    onChange({
      ...value,
      accessGroups: value.accessGroups.filter((current) => current.id !== group.id),
      entries: value.entries.map((entry) =>
        entry.accessGroupId === group.id
          ? {
              ...entry,
              accessGroupId: regularGroupId,
            }
          : entry,
      ),
    });

    setCollapsedGroups((current) => {
      const next = { ...current };
      delete next[group.id];
      return next;
    });
  };

  const resolvePendingApplicationGroup = (userId: string) =>
    pendingApplicationGroups[userId] ?? regularGroupId ?? value.accessGroups[0]?.id ?? "";

  return (
    <section className="rounded-[var(--radius-surface)] border border-border bg-panel p-5">
      <div className="space-y-4">
        <div className="space-y-1">
          <EditorSectionHeader
            title="Guestlist"
            actions={
              <>
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-4 text-body-sm uppercase tracking-[0.12em]"
                style={{ color: "var(--accent-hex)" }}
                onClick={() => setShowAddGroupModal(true)}
              >
                Add Group
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-4 text-body-sm uppercase tracking-[0.12em]"
                style={{ color: "var(--accent-hex)" }}
                onClick={() => setShowAddModal(true)}
              >
                Add Attendee
              </Button>
              </>
            }
          />
          <p className="text-body-sm text-muted">Use fictional details only. One-click demo edits stay in your tab; separate signed-in workspace edits may be shared.</p>
          {admissionMode === "curated" ? (
            <div className="rounded-[var(--radius-surface)] border border-border bg-panel p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-body-lg uppercase tracking-widerish text-[var(--accent-hex)]">
                      Applications
                    </p>
                    <p className="mt-1 text-body-sm text-muted">
                      Pending curated applications can be approved into one access group or denied.
                    </p>
                  </div>
                  <p className="text-body text-fg">
                    {pendingApplications.length} pending
                  </p>
                </div>

                {pendingApplications.length === 0 ? (
                  <p className="text-body-sm text-muted">
                    No pending applications for this event.
                  </p>
                ) : (
                  <div className="divide-y divide-border rounded-[var(--radius-surface)] border border-border bg-panel">
                    {pendingApplications.map((application) => {
                      const user = users.find((candidate) => candidate.id === application.userId);
                      const selectedAccessGroupId = resolvePendingApplicationGroup(application.userId);

                      return (
                        <div
                          key={`${eventId}-${application.userId}`}
                          className="grid gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_11rem_auto]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-body text-fg">
                              {user ? `${user.firstName} ${user.lastName}` : application.userId}
                            </p>
                            <p className="mt-1 text-body-sm text-muted">
                              @{user?.username ?? application.userId}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <DropdownSelect
                              value={selectedAccessGroupId}
                              options={value.accessGroups.map((group) => ({
                                value: group.id,
                                label: group.name,
                              }))}
                              className="h-8 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 text-body-sm text-white/72 outline-none focus:border-[var(--accent-hex)]"
                              optionClassName="text-body-sm"
                              onChange={(nextValue) =>
                                setPendingApplicationGroups((current) => ({
                                  ...current,
                                  [application.userId]: nextValue,
                                }))
                              }
                            />
                          </div>

                          <div className="flex items-center justify-end gap-3">
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-8 px-3 text-body-sm uppercase tracking-[0.12em] text-muted"
                              onClick={() => onDenyApplication(application.userId)}
                            >
                              Deny
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-8 px-3 text-body-sm uppercase tracking-[0.12em]"
                              style={{ color: "var(--accent-hex)" }}
                              onClick={() =>
                                onApproveApplication(application.userId, selectedAccessGroupId)
                              }
                            >
                              Approve
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-end gap-x-8 gap-y-3 pt-1">
            <div className="relative top-[7px] ml-1 flex items-baseline gap-3">
              <p className="text-body-lg uppercase tracking-widerish text-[#FFFFFF]">
                Attendees
              </p>
              <p className="relative -top-[2px] text-body-lg text-[#FFFFFF]">
                ({totalAttendees})
              </p>
            </div>

            <div className="relative top-[7px] ml-auto flex items-center gap-3">
              <div className="w-[14rem]">
              <Input
                value={value.searchQuery}
                placeholder="Search attendee name / username"
                className="!h-[1.7rem] !px-2.5 text-body-sm leading-none text-white/72"
                onChange={(event) =>
                  onChange({
                    ...value,
                    searchQuery: event.target.value,
                  })
                }
              />
              </div>

              <div className="w-[8rem]">
                <DropdownSelect
                  value={value.sort}
                  options={[
                    { value: "default", label: "Sort" },
                    { value: "a-z", label: "A-Z" },
                    { value: "z-a", label: "Z-A" },
                    { value: "recent", label: "Recently Added" },
                  ]}
                  className="!h-[1.7rem] w-full rounded-[var(--radius-surface)] border border-border bg-panel px-2.5 text-body-sm leading-none text-white/72 outline-none focus:border-[var(--accent-hex)]"
                  optionClassName="text-body-sm"
                  onChange={(nextSort) =>
                    onChange({
                      ...value,
                      sort: nextSort as GuestlistSort,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {value.accessGroups.map((group) => {
            const groupEntries = entriesByGroup.get(group.id) ?? [];
            const isCollapsed = collapsedGroups[group.id] ?? false;

            return (
              <section
                key={group.id}
                className="rounded-[var(--radius-surface)] border border-border bg-panel p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-body-lg uppercase tracking-widerish text-[var(--accent-hex)]">
                      {group.name}
                    </h3>
                    <p className="text-body-lg text-[var(--accent-hex)]">
                      ({groupTotals.get(group.id) ?? 0})
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <GroupActionMenu
                      group={group}
                      canDelete={group.id !== regularGroupId}
                      onDelete={(groupToDelete) => setGroupPendingDelete(groupToDelete)}
                    />
                    <button
                      type="button"
                      aria-label={isCollapsed ? `Expand ${group.name}` : `Collapse ${group.name}`}
                      className="text-body text-[var(--accent-hex)] transition-opacity hover:opacity-80"
                      onClick={() => toggleGroupCollapsed(group.id)}
                    >
                      {isCollapsed ? "▸" : "▾"}
                    </button>
                  </div>
                </div>

                {isCollapsed ? null : groupEntries.length === 0 ? (
                  <p className="mt-2 text-body-sm text-muted">
                    No attendees assigned to this access group yet.
                  </p>
                ) : (
                  <div className="mt-2 divide-y divide-border rounded-[var(--radius-surface)] border border-border bg-panel">
                    {groupEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid items-center gap-2 px-3 py-1 md:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-body text-white/74">
                            {getEntryDisplayName(entry, usersById)}
                          </p>
                        </div>
                        <div className="flex justify-end">
                          <RowActionMenu
                            entry={entry}
                            accessGroups={value.accessGroups}
                            onMove={handleMove}
                            onDelete={handleDelete}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {showAddModal ? (
        <AddGuestModal
          accessGroups={value.accessGroups}
          entries={value.entries}
          onClose={() => setShowAddModal(false)}
          onConfirm={handleAddGuest}
        />
      ) : null}

      {showAddGroupModal ? (
        <PromptDialog
          title="New Access Group"
          label="Group Name"
          placeholder="Enter access group name"
          value={newGroupName}
          confirmLabel="Add Group"
          hideClose
          hideLabel
          panelClassName="max-w-md px-5 pt-3 pb-2"
          fieldClassName="mt-2.5"
          actionsClassName="mt-2.5 -mr-4"
          titleColor="#FFFFFF"
          cancelButtonClassName="text-muted"
          onChange={setNewGroupName}
          onClose={() => {
            setShowAddGroupModal(false);
            setNewGroupName("");
          }}
          onConfirm={handleAddGroup}
        />
      ) : null}

      {groupPendingDelete ? (
        <ConfirmDialog
          title="Delete Access Group"
          message={
            (() => {
              const groupEntryCount = value.entries.filter((entry) => entry.accessGroupId === groupPendingDelete.id).length;
              return groupEntryCount > 0
                ? `Delete "${groupPendingDelete.name}"?\n\n${groupEntryCount} attendee${groupEntryCount === 1 ? "" : "s"} will be moved to Regular Entry.`
                : `Delete "${groupPendingDelete.name}"?\n\nThis group has no attendees.`;
            })()
          }
          confirmLabel="Delete Group"
          confirmTone="warning"
          hideClose
          onClose={() => setGroupPendingDelete(null)}
          onConfirm={() => {
            handleDeleteGroup(groupPendingDelete);
            setGroupPendingDelete(null);
          }}
        />
      ) : null}
    </section>
  );
}
