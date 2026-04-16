"use client";

import { useState } from "react";
import { DateTimeInput } from "@/components/editor/date-time-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { DIALOG_ACTION_CLASS, DIALOG_FIELD_LABEL_CLASS, DIALOG_TITLE_CLASS } from "@/components/ui/action-dialog";
import { EditorSectionHeader } from "@/components/editor/editor-section-header";
import type { ArtistProfile } from "@/types/event";

export type TimetableRowDraft = {
  id: string;
  title: string;
  lineupEntryId: string;
  room: string;
  notes: string;
  startTime: string;
  endTime: string;
};

export type TimetableFormState = {
  startTime: string;
  endTime: string;
  rows: TimetableRowDraft[];
};

export type TimetableRowErrors = Partial<
  Record<"title" | "startTime" | "endTime", string>
>;

type TimetableTabProps = {
  eventTitle: string;
  eventDate?: string;
  value: TimetableFormState;
  rowErrors: Record<string, TimetableRowErrors>;
  lineupArtists: ArtistProfile[];
  roomOptions: Array<{ id: string; name: string }>;
  onChange: (nextState: TimetableFormState) => void;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeTimeValue(value: string) {
  if (!value) {
    return "99:99";
  }

  return value;
}

function formatTimeRange(row: TimetableRowDraft) {
  const start = row.startTime || "--:--";
  const end = row.endTime || "--:--";
  return `${start} - ${end}`;
}

function createEmptyRow(initialRoom = ""): TimetableRowDraft {
  return {
    id: `timetable-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    lineupEntryId: "",
    room: initialRoom,
    notes: "",
    startTime: "",
    endTime: "",
  };
}

function updateRow(
  rows: TimetableRowDraft[],
  id: string,
  field: keyof TimetableRowDraft,
  nextValue: string,
) {
  return rows.map((row) =>
    row.id === id
      ? {
          ...row,
          [field]: nextValue,
        }
      : row,
  );
}

function AddTimetableRowModal({
  lineupOptions,
  roomOptions,
  initialRoom,
  onClose,
  onConfirm,
}: {
  lineupOptions: Array<{ value: string; label: string }>;
  roomOptions: Array<{ value: string; label: string }>;
  initialRoom?: string;
  onClose: () => void;
  onConfirm: (draft: TimetableRowDraft) => void;
}) {
  const [draft, setDraft] = useState<TimetableRowDraft>(() => createEmptyRow(initialRoom));

  const isValid =
    draft.title.trim().length > 0 &&
    draft.startTime.trim().length > 0 &&
    draft.endTime.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-[var(--radius-surface)] border border-border bg-panel p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <h3 className={`${DIALOG_TITLE_CLASS} text-[#FFFFFF]`}>
            New Timetable Row
          </h3>
        </div>

        <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_8.5rem_8.5rem_minmax(0,0.9fr)]">
          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>
              Title
            </label>
            <Input
              value={draft.title}
              placeholder="Set title"
              className="mt-1 text-body text-white/72"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </div>

          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>
              DJ
            </label>
            <DropdownSelect
              value={draft.lineupEntryId}
              options={lineupOptions}
              className="mt-1 h-8 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 text-body text-white/72 outline-none focus:border-[var(--accent-hex)]"
              optionClassName="text-body"
              onChange={(nextValue) =>
                setDraft((current) => ({
                  ...current,
                  lineupEntryId: nextValue,
                }))
              }
            />
          </div>

          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>
              Start
            </label>
            <DateTimeInput
              picker="time"
              value={draft.startTime}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  startTime: event.target.value,
                }))
              }
            />
          </div>

          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>
              End
            </label>
            <DateTimeInput
              picker="time"
              value={draft.endTime}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  endTime: event.target.value,
                }))
              }
            />
          </div>

          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>
              Room
            </label>
            <DropdownSelect
              value={draft.room}
              options={roomOptions}
              className="mt-1 h-8 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 text-body text-white/72 outline-none focus:border-[var(--accent-hex)]"
              optionClassName="text-body"
              onChange={(nextValue) =>
                setDraft((current) => ({
                  ...current,
                  room: nextValue,
                }))
              }
            />
          </div>
        </div>

        <div className="mt-4">
          <label className={DIALOG_FIELD_LABEL_CLASS}>
            Notes
          </label>
          <Input
            value={draft.notes}
            placeholder="Optional note"
            className="mt-1 text-body text-white/72"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
          />
        </div>

        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            className={DIALOG_ACTION_CLASS}
            style={{ color: "var(--accent-hex)" }}
            disabled={!isValid}
            onClick={() => onConfirm(draft)}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TimetableTab({
  eventTitle,
  eventDate,
  value,
  rowErrors,
  lineupArtists,
  roomOptions,
  onChange,
}: TimetableTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addRowRoom, setAddRowRoom] = useState<string>("");
  const lineupOptions = [
    { value: "", label: "No DJ" },
    ...lineupArtists.map((artist) => ({ value: artist.id, label: artist.name })),
  ];
  const rowRoomLabels = Array.from(
    new Set(
      value.rows
        .map((row) => row.room.trim())
        .filter((roomName) => roomName.length > 0),
    ),
  );
  const roomDropdownOptions = [
    { value: "", label: "No room" },
    ...roomOptions.map((room) => ({ value: room.name, label: room.name })),
    ...rowRoomLabels
      .filter((roomName) => !roomOptions.some((room) => room.name === roomName))
      .map((roomName) => ({ value: roomName, label: roomName })),
  ];
  const roomOrder = new Map(roomOptions.map((room, index) => [room.name, index]));
  const groupedRows = value.rows.reduce<Map<string, TimetableRowDraft[]>>((acc, row) => {
    const roomName = row.room || "Unassigned";
    const existing = acc.get(roomName) ?? [];
    existing.push(row);
    acc.set(roomName, existing);
    return acc;
  }, new Map());
  const sortedRoomSections = Array.from(
    new Set([
      ...roomOptions.map((room) => room.name),
      ...Array.from(groupedRows.keys()),
    ]),
  )
    .sort((leftRoom, rightRoom) => {
      const leftOrder =
        leftRoom === "Unassigned"
          ? Number.MAX_SAFE_INTEGER
          : (roomOrder.get(leftRoom) ?? Number.MAX_SAFE_INTEGER - 1);
      const rightOrder =
        rightRoom === "Unassigned"
          ? Number.MAX_SAFE_INTEGER
          : (roomOrder.get(rightRoom) ?? Number.MAX_SAFE_INTEGER - 1);

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return leftRoom.localeCompare(rightRoom);
    })
    .map((roomName) => [roomName, groupedRows.get(roomName) ?? []] as const);

  const handlePrint = () => {
    const lineupNameById = new Map(
      lineupArtists.map((artist) => [artist.id, artist.name]),
    );
    const roomOrder = new Map(
      roomOptions.map((room, index) => [room.name, index]),
    );
    const groupedRows = value.rows.reduce<Map<string, TimetableRowDraft[]>>(
      (acc, row) => {
        const roomName = row.room || "Unassigned";
        const existing = acc.get(roomName) ?? [];
        existing.push(row);
        acc.set(roomName, existing);
        return acc;
      },
      new Map(),
    );

    const sortedRoomSections = Array.from(groupedRows.entries()).sort(
      ([leftRoom], [rightRoom]) => {
        const leftOrder =
          leftRoom === "Unassigned"
            ? Number.MAX_SAFE_INTEGER
            : (roomOrder.get(leftRoom) ?? Number.MAX_SAFE_INTEGER - 1);
        const rightOrder =
          rightRoom === "Unassigned"
            ? Number.MAX_SAFE_INTEGER
            : (roomOrder.get(rightRoom) ?? Number.MAX_SAFE_INTEGER - 1);

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return leftRoom.localeCompare(rightRoom);
      },
    );

    const roomSections = sortedRoomSections
      .map(([roomName, rows]) => {
        const sortedRows = [...rows].sort((left, right) => {
          const timeComparison = normalizeTimeValue(left.startTime).localeCompare(
            normalizeTimeValue(right.startTime),
          );

          if (timeComparison !== 0) {
            return timeComparison;
          }

          return normalizeTimeValue(left.endTime).localeCompare(
            normalizeTimeValue(right.endTime),
          );
        });

        const rowMarkup = sortedRows
          .map(
            (row) => `
              <tr>
                <td class="time-cell">${escapeHtml(formatTimeRange(row))}</td>
                <td class="title-cell">${escapeHtml(row.title || "Untitled slot")}</td>
                <td class="dj-cell">${escapeHtml(lineupNameById.get(row.lineupEntryId) ?? "No DJ")}</td>
                <td class="notes-cell">${escapeHtml(row.notes || "")}</td>
              </tr>
            `,
          )
          .join("");

        return `
          <section class="room-section">
            <h2>${escapeHtml(roomName)}</h2>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Title</th>
                  <th>DJ</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${rowMarkup}
              </tbody>
            </table>
          </section>
        `;
      })
      .join("");

    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) {
      return;
    }

    const title = escapeHtml(eventTitle || "Event Timetable");
    const dateLine = eventDate
      ? `<p class="event-date">${escapeHtml(eventDate)}</p>`
      : "";
    const emptyState =
      roomSections.trim().length > 0
        ? roomSections
        : `<p class="empty-state">No timetable rows yet.</p>`;

    printWindow.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${title} Timetable</title>
          <style>
            :root {
              color-scheme: light;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, Helvetica, sans-serif;
              color: #101318;
              background: #ffffff;
            }

            .sheet {
              max-width: 980px;
              margin: 0 auto;
            }

            .eyebrow {
              margin: 0;
              color: #6b7280;
              font-size: 11px;
              letter-spacing: 0.24em;
              text-transform: uppercase;
            }

            h1 {
              margin: 10px 0 0;
              font-size: 30px;
              line-height: 1.1;
            }

            .event-date {
              margin: 8px 0 0;
              color: #4b5563;
              font-size: 14px;
            }

            .room-section {
              margin-top: 28px;
              break-inside: avoid;
            }

            .room-section h2 {
              margin: 0 0 10px;
              font-size: 15px;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: #111827;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            thead th {
              padding: 0 0 10px;
              border-bottom: 1px solid #d1d5db;
              text-align: left;
              font-size: 11px;
              letter-spacing: 0.16em;
              text-transform: uppercase;
              color: #6b7280;
            }

            tbody td {
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
              vertical-align: top;
              font-size: 13px;
              line-height: 1.4;
            }

            .time-cell {
              width: 22%;
              color: #111827;
              white-space: nowrap;
            }

            .title-cell {
              width: 28%;
              font-weight: 600;
            }

            .dj-cell {
              width: 22%;
              color: #374151;
            }

            .notes-cell {
              color: #4b5563;
            }

            .empty-state {
              margin-top: 24px;
              color: #6b7280;
              font-size: 14px;
            }

            @media print {
              body {
                padding: 18px;
              }
            }
          </style>
        </head>
        <body>
          <main class="sheet">
            <p class="eyebrow">Timetable</p>
            <h1>${title}</h1>
            ${dateLine}
            ${emptyState}
          </main>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <>
      <section className="rounded-[var(--radius-surface)] border border-border bg-panel p-5">
      <div className="space-y-6">
        <div className="space-y-4">
          <EditorSectionHeader
            title="Timetable"
            actions={
              <Button
                type="button"
                variant="ghost"
                className="h-6 pl-2.5 pr-0 text-body-sm uppercase tracking-[0.1em]"
                style={{ color: "var(--accent-hex)" }}
                onClick={handlePrint}
              >
                Print
              </Button>
            }
          />
          <div className="grid gap-4 md:grid-cols-[8.5rem_8.5rem_minmax(0,1fr)] md:items-start">
            <div>
              <label className="text-body uppercase tracking-widerish text-fg">
                Start Time
              </label>
              <DateTimeInput
                picker="time"
                value={value.startTime}
                onChange={(event) =>
                  onChange({
                    ...value,
                    startTime: event.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="text-body uppercase tracking-widerish text-fg">
                End Time
              </label>
              <DateTimeInput
                picker="time"
                value={value.endTime}
                onChange={(event) =>
                  onChange({
                    ...value,
                    endTime: event.target.value,
                  })
                }
              />
            </div>
            <div />
          </div>
        </div>

        <div className="space-y-3">
          {sortedRoomSections.length === 0 ? (
            <div className="rounded-[var(--radius-surface)] border border-dashed border-border bg-panel px-4 py-4 text-body-sm text-muted">
              No rooms or schedule rows yet. Add rooms in Cover first to build the timetable by room.
            </div>
          ) : (
            <div className="space-y-[3rem]">
              {sortedRoomSections.map(([roomName, roomRows]) => {
                const sortedRows = [...roomRows].sort((left, right) => {
                  const endComparison = normalizeTimeValue(left.endTime).localeCompare(
                    normalizeTimeValue(right.endTime),
                  );

                  if (endComparison !== 0) {
                    return endComparison;
                  }

                  return normalizeTimeValue(left.startTime).localeCompare(
                    normalizeTimeValue(right.startTime),
                  );
                });

                return (
                  <div key={roomName} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-['Space_Grotesk'] text-body-lg uppercase tracking-widerish text-[#FFFFFF]">
                        {roomName}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 pl-4 pr-1 text-body-sm uppercase tracking-[0.12em]"
                        style={{ color: "var(--accent-hex)" }}
                        onClick={() => {
                          setAddRowRoom(roomName === "Unassigned" ? "" : roomName);
                          setShowAddModal(true);
                        }}
                      >
                        Add Row
                      </Button>
                    </div>
                    {sortedRows.length === 0 ? (
                      <div className="rounded-[var(--radius-surface)] border border-dashed border-border bg-panel px-4 py-4 text-body-sm text-muted">
                        No rows in this room yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sortedRows.map((row) => {
                      const errors = rowErrors[row.id] ?? {};

                      return (
                        <div
                          key={row.id}
                          className="relative rounded-[var(--radius-surface)] border border-border bg-panel p-4"
                        >
                          <button
                            type="button"
                            aria-label="Delete timetable row"
                            className="absolute right-3 top-2 text-body-lg uppercase leading-none text-[var(--accent-hex)] transition hover:opacity-80"
                            onClick={() =>
                              onChange({
                                ...value,
                                rows: value.rows.filter((item) => item.id !== row.id),
                              })
                            }
                          >
                            ×
                          </button>
                          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_8.5rem_8.5rem_minmax(0,0.9fr)]">
                      <div>
                        <label className="text-body uppercase tracking-widerish text-fg">
                          Title
                        </label>
                        <Input
                          value={row.title}
                          placeholder="Set title"
                          className="mt-1 text-body text-white/72"
                          onChange={(event) =>
                            onChange({
                              ...value,
                              rows: updateRow(value.rows, row.id, "title", event.target.value),
                            })
                          }
                        />
                        {errors.title ? (
                          <p className="mt-1 text-body-sm text-[hsl(var(--warning))]">
                            {errors.title}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label className="text-body uppercase tracking-widerish text-fg">
                          DJ
                        </label>
                        <DropdownSelect
                          value={row.lineupEntryId}
                          options={lineupOptions}
                          className="mt-1 h-8 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 text-body text-white/72 outline-none focus:border-[var(--accent-hex)]"
                          optionClassName="text-body"
                          onChange={(nextValue) =>
                            onChange({
                              ...value,
                              rows: updateRow(
                                value.rows,
                                row.id,
                                "lineupEntryId",
                                nextValue,
                              ),
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="text-body uppercase tracking-widerish text-fg">
                          Start
                        </label>
                        <DateTimeInput
                          picker="time"
                          value={row.startTime}
                          onChange={(event) =>
                            onChange({
                              ...value,
                              rows: updateRow(
                                value.rows,
                                row.id,
                                "startTime",
                                event.target.value,
                              ),
                            })
                          }
                        />
                        {errors.startTime ? (
                          <p className="mt-1 text-body-sm text-[hsl(var(--warning))]">
                            {errors.startTime}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label className="text-body uppercase tracking-widerish text-fg">
                          End
                        </label>
                        <DateTimeInput
                          picker="time"
                          value={row.endTime}
                          onChange={(event) =>
                            onChange({
                              ...value,
                              rows: updateRow(value.rows, row.id, "endTime", event.target.value),
                            })
                          }
                        />
                        {errors.endTime ? (
                          <p className="mt-1 text-body-sm text-[hsl(var(--warning))]">
                            {errors.endTime}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label className="text-body uppercase tracking-widerish text-fg">
                          Room
                        </label>
                        <DropdownSelect
                          value={row.room}
                          options={roomDropdownOptions}
                          className="mt-1 h-8 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 text-body text-white/72 outline-none focus:border-[var(--accent-hex)]"
                          optionClassName="text-body"
                          onChange={(nextValue) =>
                            onChange({
                              ...value,
                              rows: updateRow(value.rows, row.id, "room", nextValue),
                            })
                          }
                        />
                      </div>

                    </div>

                          <div className="mt-4">
                            <label className="text-body uppercase tracking-widerish text-fg">
                              Notes
                            </label>
                            <Input
                              value={row.notes}
                              placeholder="Optional note"
                              className="mt-1 text-body text-white/72"
                              onChange={(event) =>
                                onChange({
                                  ...value,
                                  rows: updateRow(value.rows, row.id, "notes", event.target.value),
                                })
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </section>
      {showAddModal ? (
        <AddTimetableRowModal
          lineupOptions={lineupOptions}
          roomOptions={roomDropdownOptions}
          initialRoom={addRowRoom}
          onClose={() => setShowAddModal(false)}
          onConfirm={(draft) => {
            onChange({
              ...value,
              rows: [...value.rows, draft],
            });
            setAddRowRoom("");
            setShowAddModal(false);
          }}
        />
      ) : null}
    </>
  );
}
