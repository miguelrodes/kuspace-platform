"use client";

import { KeyboardEvent, useMemo, useState } from "react";
import type { ArtistProfile, EventDisplayMode } from "@/types/event";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MetaTag } from "@/components/ui/meta-tag";
import { DIALOG_ACTION_CLASS, DIALOG_FIELD_LABEL_CLASS, DIALOG_TITLE_CLASS } from "@/components/ui/action-dialog";
import { EditorSectionHeader } from "@/components/editor/editor-section-header";
import { DropdownSelect } from "@/components/ui/dropdown-select";

export type LineupFormState = {
  displayMode: EventDisplayMode;
  selectedArtists: ArtistProfile[];
  manualInput: string;
  libraryQuery: string;
  roomAssignments: Record<string, string[]>;
};

type LineupTabProps = {
  value: LineupFormState;
  availableArtists: ArtistProfile[];
  roomOptions: Array<{ id: string; name: string }>;
  onChange: (nextState: LineupFormState) => void;
  onArtistsCatalogChange: (artists: ArtistProfile[]) => void;
};

function normalizeRoomAssignment(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value];
  }

  return [];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createArtistDraft(name: string): ArtistProfile {
  return {
    id: `artist-${slugify(name)}`,
    name,
    contact: "",
    notes: "",
    instagram: "",
    residentAdvisor: "",
    website: "",
  };
}

function ArtistModal({
  artist,
  onClose,
  onSave,
}: {
  artist: ArtistProfile;
  onClose: () => void;
  onSave: (artist: ArtistProfile) => void;
}) {
  const [draft, setDraft] = useState<ArtistProfile>(artist);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-[var(--radius-surface)] border border-border bg-panel p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <h3 className={`${DIALOG_TITLE_CLASS} text-[#FFFFFF]`}>
            Artist Details
          </h3>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>
              Name
            </label>
            <Input
              value={draft.name}
              className="mt-1 text-body text-white/72"
              onChange={(event) =>
                setDraft({
                  ...draft,
                  name: event.target.value,
                })
              }
            />
          </div>

          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>
              Contact
            </label>
            <Input
              value={draft.contact ?? ""}
              placeholder="Optional"
              className="mt-1 text-body text-white/72"
              onChange={(event) =>
                setDraft({
                  ...draft,
                  contact: event.target.value,
                })
              }
            />
          </div>

          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>
              Instagram
            </label>
            <Input
              value={draft.instagram ?? ""}
              placeholder="Optional"
              className="mt-1 text-body text-white/72"
              onChange={(event) =>
                setDraft({
                  ...draft,
                  instagram: event.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="text-body-lg uppercase tracking-widerish text-fg">
              RA
            </label>
            <Input
              value={draft.residentAdvisor ?? ""}
              placeholder="Optional"
              className="mt-1 text-body text-white/72"
              onChange={(event) =>
                setDraft({
                  ...draft,
                  residentAdvisor: event.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="text-body-lg tracking-widerish text-fg">
              Website
            </label>
            <Input
              value={draft.website ?? ""}
              placeholder="Optional"
              className="mt-1 text-body text-white/72"
              onChange={(event) =>
                setDraft({
                  ...draft,
                  website: event.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="text-body-lg tracking-widerish text-fg">
              Notes
            </label>
            <textarea
              value={draft.notes ?? ""}
              rows={4}
              className="mt-1 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-3 text-body text-white/72 outline-none placeholder:text-body-sm placeholder:text-muted focus:border-[var(--accent-hex)]"
              onChange={(event) =>
                setDraft({
                  ...draft,
                  notes: event.target.value,
                })
              }
            />
          </div>
        </div>

        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            className={DIALOG_ACTION_CLASS}
            style={{ color: "var(--accent-hex)" }}
            onClick={() => {
              onSave({
                ...draft,
                name: draft.name.trim(),
              });
            }}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LineupTab({
  value,
  availableArtists,
  roomOptions,
  onChange,
  onArtistsCatalogChange,
}: LineupTabProps) {
  const [editingArtist, setEditingArtist] = useState<ArtistProfile | null>(null);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [roomManualInputs, setRoomManualInputs] = useState<Record<string, string>>({});
  const [roomLibraryQueries, setRoomLibraryQueries] = useState<Record<string, string>>({});

  const filteredArtists = useMemo(() => {
    const query = value.libraryQuery.trim().toLowerCase();

    return availableArtists.filter((artist) => {
      if (value.selectedArtists.some((selected) => selected.id === artist.id)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return artist.name.toLowerCase().includes(query);
    });
  }, [availableArtists, value.libraryQuery, value.selectedArtists]);

  const addArtistToLineup = (artist: ArtistProfile) => {
    if (value.selectedArtists.some((selected) => selected.id === artist.id)) {
      return;
    }

    onChange({
      ...value,
      selectedArtists: [...value.selectedArtists, artist],
      roomAssignments: {
        ...value.roomAssignments,
        [artist.id]: normalizeRoomAssignment(value.roomAssignments[artist.id]),
      },
    });
  };

  const addArtistToRoomLineup = (artist: ArtistProfile, roomId: string) => {
    const existingAssignments = normalizeRoomAssignment(value.roomAssignments[artist.id]);

    if (value.selectedArtists.some((selected) => selected.id === artist.id)) {
      if (existingAssignments.includes(roomId)) {
        return;
      }

      onChange({
        ...value,
        roomAssignments: {
          ...value.roomAssignments,
          [artist.id]: [...existingAssignments, roomId],
        },
      });
      return;
    }

    onChange({
      ...value,
      selectedArtists: [...value.selectedArtists, artist],
      roomAssignments: {
        ...value.roomAssignments,
        [artist.id]: [roomId],
      },
    });
  };

  const handleManualAdd = () => {
    const nextName = value.manualInput.trim();

    if (!nextName) {
      return;
    }

    const existingArtist = availableArtists.find(
      (artist) => artist.name.toLowerCase() === nextName.toLowerCase(),
    );

    const nextArtist = existingArtist ?? createArtistDraft(nextName);

    if (value.selectedArtists.some((artist) => artist.id === nextArtist.id)) {
      onChange({
        ...value,
        manualInput: "",
      });
      return;
    }

    onChange({
      ...value,
      manualInput: "",
      selectedArtists: [...value.selectedArtists, nextArtist],
      roomAssignments: {
        ...value.roomAssignments,
        [nextArtist.id]: normalizeRoomAssignment(value.roomAssignments[nextArtist.id]),
      },
    });
  };

  const handleManualKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleManualAdd();
    }
  };

  const handleRoomManualAdd = (roomId: string) => {
    const nextName = (roomManualInputs[roomId] ?? "").trim();

    if (!nextName) {
      return;
    }

    const existingArtist = availableArtists.find(
      (artist) => artist.name.toLowerCase() === nextName.toLowerCase(),
    );

    const nextArtist = existingArtist ?? createArtistDraft(nextName);
    addArtistToRoomLineup(nextArtist, roomId);
    setRoomManualInputs((current) => ({
      ...current,
      [roomId]: "",
    }));
  };

  const handleRoomManualKeyDown = (event: KeyboardEvent<HTMLInputElement>, roomId: string) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleRoomManualAdd(roomId);
    }
  };

  const removeArtistFromRoom = (artistId: string, roomId: string) => {
    const nextAssignments = normalizeRoomAssignment(value.roomAssignments[artistId]).filter(
      (id) => id !== roomId,
    );

    onChange({
      ...value,
      selectedArtists:
        nextAssignments.length === 0
          ? value.selectedArtists.filter((selected) => selected.id !== artistId)
          : value.selectedArtists,
      roomAssignments: {
        ...value.roomAssignments,
        [artistId]: nextAssignments,
      },
    });
  };

  const roomGroups = useMemo(
    () =>
      roomOptions.map((room) => ({
        ...room,
        artists: value.selectedArtists.filter((artist) =>
          normalizeRoomAssignment(value.roomAssignments[artist.id]).includes(room.id),
        ),
      })),
    [roomOptions, value.roomAssignments, value.selectedArtists],
  );

  return (
    <>
      <section className="rounded-[var(--radius-surface)] border border-border bg-panel p-5">
        <div className="space-y-6.5">
          <div className="space-y-3">
            <EditorSectionHeader
              title="Lineup"
              actions={
                <div className="flex items-center gap-2">
                  <DropdownSelect
                    value={value.displayMode}
                    options={[
                      { value: "event", label: "Event-wide" },
                      {
                        value: "room",
                        label: "By room",
                        disabled: roomOptions.length === 0,
                      },
                    ]}
                    className="h-7 w-[10.25rem] justify-end gap-1 rounded-[var(--radius-button-tag)] bg-transparent px-2.5 py-0 text-body-sm uppercase tracking-widerish text-fg transition hover:opacity-80"
                    labelClassName="text-right"
                    optionClassName="text-body-sm uppercase tracking-widerish"
                    ariaLabel="Select lineup display mode"
                    onChange={(nextValue) =>
                      onChange({
                        ...value,
                        displayMode: nextValue as EventDisplayMode,
                      })
                    }
                  />
                </div>
              }
            />

            {value.displayMode === "room" && roomOptions.length === 0 ? (
              <p className="text-body-sm text-muted">
                Add rooms in Cover first to organize the lineup by room.
              </p>
            ) : value.selectedArtists.length === 0 ? (
              <p className="text-body-sm text-muted">
                No artists selected yet. Add names manually or choose from performed artists below.
              </p>
            ) : value.displayMode === "event" ? (
              <div className="flex flex-wrap gap-2">
                {value.selectedArtists.map((artist) => (
                  <MetaTag key={artist.id} className="gap-2 px-3 py-1">
                    <button
                      type="button"
                      className="text-left text-fg transition hover:opacity-80"
                      onClick={() => setEditingArtist(artist)}
                    >
                      {artist.name}
                    </button>
                    <button
                      type="button"
                      className="text-muted transition hover:text-fg"
                      onClick={() =>
                        onChange({
                          ...value,
                          selectedArtists: value.selectedArtists.filter(
                            (selected) => selected.id !== artist.id,
                          ),
                        })
                      }
                    >
                      ×
                    </button>
                  </MetaTag>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {roomGroups.map((room) => {
                  const isExpanded = expandedRoomId === room.id;
                  const roomFilteredArtists = availableArtists.filter((artist) => {
                    if (normalizeRoomAssignment(value.roomAssignments[artist.id]).includes(room.id)) {
                      return false;
                    }

                    const query = (roomLibraryQueries[room.id] ?? "").trim().toLowerCase();
                    if (!query) {
                      return true;
                    }

                    return artist.name.toLowerCase().includes(query);
                  });

                  return (
                  <div
                    key={room.id}
                    className="rounded-[var(--radius-surface)] border border-border bg-panel p-3"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p
                            className="text-body uppercase tracking-widerish"
                            style={{
                              color: "var(--accent-hex)",
                              fontFamily: "var(--font-space-grotesk)",
                            }}
                          >
                            {room.name}
                          </p>
                          {room.artists.length === 0 ? (
                            <p className="text-body-sm text-muted">No artists assigned yet.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {room.artists.map((artist) => (
                                <MetaTag key={artist.id} className="gap-2 px-3 py-1">
                                  <button
                                    type="button"
                                    className="text-left text-fg transition hover:opacity-80"
                                    onClick={() => setEditingArtist(artist)}
                                  >
                                    {artist.name}
                                  </button>
                                  <button
                                    type="button"
                                    className="text-muted transition hover:text-fg"
                                    onClick={() => removeArtistFromRoom(artist.id, room.id)}
                                  >
                                    ×
                                  </button>
                                </MetaTag>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="shrink-0 self-center text-body-sm uppercase tracking-widerish transition hover:opacity-80"
                          style={{ color: "var(--accent-hex)" }}
                          onClick={() =>
                            setExpandedRoomId((current) => (current === room.id ? null : room.id))
                          }
                        >
                          {isExpanded ? "Set" : "Edit Lineup"}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="text-body-sm uppercase tracking-widerish text-fg">
                              Add Artist
                            </label>
                            <div className="mt-1 flex gap-3">
                              <Input
                                value={roomManualInputs[room.id] ?? ""}
                                placeholder="Type a DJ name and press Enter"
                                className="h-7 px-2.5 text-body-sm text-white/72"
                                onChange={(event) =>
                                  setRoomManualInputs((current) => ({
                                    ...current,
                                    [room.id]: event.target.value,
                                  }))
                                }
                                onKeyDown={(event) => handleRoomManualKeyDown(event, room.id)}
                              />
                              <Button
                                type="button"
                                variant="subtle"
                                className="h-7 px-3 text-body-sm uppercase tracking-[0.12em]"
                                onClick={() => handleRoomManualAdd(room.id)}
                              >
                                Add
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="text-body-sm uppercase tracking-widerish text-fg">
                                Search Previous Artist
                              </label>
                              <Input
                                value={roomLibraryQueries[room.id] ?? ""}
                                placeholder="Search artists already played"
                                className="mt-1 h-7 px-2.5 text-body-sm text-white/72"
                                onChange={(event) =>
                                  setRoomLibraryQueries((current) => ({
                                    ...current,
                                    [room.id]: event.target.value,
                                  }))
                                }
                              />
                            </div>

                            <div className="max-h-[8.5rem] overflow-y-auto rounded-[var(--radius-surface)] border border-border bg-panel">
                              {roomFilteredArtists.length === 0 ? (
                                <p className="px-4 py-4 text-body-sm text-muted">
                                  No performed artists match this search.
                                </p>
                              ) : (
                                <div className="divide-y divide-white/5">
                                  {roomFilteredArtists.map((artist) => (
                                    <div
                                      key={artist.id}
                                      className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 transition hover:bg-white/5"
                                      onClick={() => addArtistToRoomLineup(artist, room.id)}
                                    >
                                      <button
                                        type="button"
                                        className="truncate text-left text-body-sm tracking-widerish text-muted transition hover:text-fg"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setEditingArtist(artist);
                                        }}
                                      >
                                        {artist.name}
                                      </button>
                                      <button
                                        type="button"
                                        className="shrink-0 text-body-sm uppercase tracking-widerish transition hover:opacity-80"
                                        style={{ color: "var(--accent-hex)" }}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          addArtistToRoomLineup(artist, room.id);
                                        }}
                                      >
                                        Add
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      ) : null}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>

          {value.displayMode === "event" ? (
            <>
              <div className="pt-1">
                <label className="text-body uppercase tracking-widerish text-fg">
                  Add Artist
                </label>
                <div className="mt-1 flex gap-3">
                  <Input
                    value={value.manualInput}
                    placeholder="Type a DJ name and press Enter"
                    className="text-body text-white/72"
                    onChange={(event) =>
                      onChange({
                        ...value,
                        manualInput: event.target.value,
                      })
                    }
                    onKeyDown={handleManualKeyDown}
                  />
                  <Button
                    type="button"
                    variant="subtle"
                    className="h-8 px-4 text-body-sm uppercase tracking-[0.12em]"
                    onClick={handleManualAdd}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-3 -mt-0.5">
                <div>
                  <label className="text-body-sm uppercase tracking-widerish text-fg">
                    Previous Artists
                  </label>
                  <Input
                    value={value.libraryQuery}
                    placeholder="Search artists already played"
                    className="mt-1 text-body text-white/72"
                    onChange={(event) =>
                      onChange({
                        ...value,
                        libraryQuery: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="max-h-[8.5rem] overflow-y-auto rounded-[var(--radius-surface)] border border-border bg-panel">
                  {filteredArtists.length === 0 ? (
                    <p className="px-4 py-4 text-body-sm text-muted">
                      No performed artists match this search.
                    </p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {filteredArtists.map((artist) => (
                        <div
                          key={artist.id}
                          className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 transition hover:bg-white/5"
                          onClick={() => addArtistToLineup(artist)}
                        >
                          <button
                            type="button"
                            className="truncate text-left text-body-sm tracking-widerish text-muted transition hover:text-fg"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditingArtist(artist);
                            }}
                          >
                            {artist.name}
                          </button>
                          <button
                            type="button"
                            className="text-body-sm uppercase tracking-widerish transition hover:opacity-80"
                            style={{ color: "var(--accent-hex)" }}
                            onClick={(event) => {
                              event.stopPropagation();
                              addArtistToLineup(artist);
                            }}
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {editingArtist ? (
        <ArtistModal
          artist={editingArtist}
          onClose={() => setEditingArtist(null)}
          onSave={(nextArtist) => {
            onArtistsCatalogChange([nextArtist]);
            onChange({
              ...value,
              selectedArtists: value.selectedArtists.map((artist) =>
                artist.id === nextArtist.id ? nextArtist : artist,
              ),
            });
            setEditingArtist(null);
          }}
        />
      ) : null}
    </>
  );
}
