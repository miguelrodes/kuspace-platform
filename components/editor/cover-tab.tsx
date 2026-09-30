"use client";

import { ChangeEvent, KeyboardEvent, useMemo, useState } from "react";
import { DateTimeInput } from "@/components/editor/date-time-input";
import { Input } from "@/components/ui/input";
import { MetaTag } from "@/components/ui/meta-tag";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { EventPoster } from "@/components/home/event-poster";
import { EventCard } from "@/components/events/event-card";
import type { AdmissionMode, EventDisplayMode } from "@/types/event";

export type RoomDraft = {
  id: string;
  name: string;
  capacity: string;
  genres: string[];
};

export type CoverFormState = {
  title: string;
  description: string;
  admissionMode: AdmissionMode;
  genreDisplayMode: EventDisplayMode;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  venue: string;
  capacityTarget: string;
  imageUrl: string;
  imageAlt: string;
  genres: string[];
  genreInput: string;
  rooms: RoomDraft[];
};

type CoverFieldErrors = Partial<Record<"title" | "date" | "location" | "genres", string>>;

type CoverTabProps = {
  value: CoverFormState;
  errors: CoverFieldErrors;
  lineupPreview: string;
  onChange: (nextState: CoverFormState) => void;
};

function RequiredMark() {
  return (
    <span
      aria-hidden="true"
      className="relative -top-1 ml-0.5 inline-block align-top text-body-sm leading-none"
      style={{ color: "var(--accent-hex)" }}
    >
      ×
    </span>
  );
}

function buildCompletionItems(value: CoverFormState) {
  const hasGenres =
    value.genreDisplayMode === "event"
      ? value.genres.length > 0
      : value.rooms.some((room) => room.genres.length > 0);

  return [
    Boolean(value.title.trim()),
    Boolean(value.date.trim()),
    Boolean(value.startTime.trim()),
    Boolean(value.endTime.trim()),
    Boolean(value.location.trim()),
    Boolean(value.venue.trim()),
    hasGenres,
  ];
}

function updateRoom(
  rooms: RoomDraft[],
  id: string,
  field: keyof RoomDraft,
  nextValue: string | string[],
) {
  return rooms.map((room) =>
    room.id === id
      ? {
          ...room,
          [field]: nextValue,
        }
      : room,
  );
}

export function CoverTab({ value, errors, lineupPreview, onChange }: CoverTabProps) {
  const [previewSource, setPreviewSource] = useState<string | null>(null);
  const [roomGenreInputs, setRoomGenreInputs] = useState<Record<string, string>>({});
  const completionItems = useMemo(() => buildCompletionItems(value), [value]);
  const completionCount = completionItems.filter(Boolean).length;
  const completionPercent = Math.round((completionCount / completionItems.length) * 100);

  const effectiveImageUrl = previewSource ?? value.imageUrl;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewSource(objectUrl);
    onChange({
      ...value,
      imageUrl: objectUrl,
      imageAlt: file.name,
    });
  };

  const handleGenreCommit = () => {
    const nextTag = value.genreInput.trim();

    if (!nextTag) {
      return;
    }

    if (value.genres.some((genre) => genre.toLowerCase() === nextTag.toLowerCase())) {
      onChange({
        ...value,
        genreInput: "",
      });
      return;
    }

    onChange({
      ...value,
      genres: [...value.genres, nextTag],
      genreInput: "",
    });
  };

  const handleGenreKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      handleGenreCommit();
      return;
    }

    if (event.key === "Backspace" && value.genreInput === "" && value.genres.length > 0) {
      onChange({
        ...value,
        genres: value.genres.slice(0, -1),
      });
    }
  };

  const handleRoomGenreCommit = (roomId: string) => {
    const nextTag = (roomGenreInputs[roomId] ?? "").trim();
    if (!nextTag) {
      return;
    }

    const room = value.rooms.find((item) => item.id === roomId);
    if (!room) {
      return;
    }

    if (room.genres.some((genre) => genre.toLowerCase() === nextTag.toLowerCase())) {
      setRoomGenreInputs((current) => ({ ...current, [roomId]: "" }));
      return;
    }

    onChange({
      ...value,
      rooms: updateRoom(value.rooms, roomId, "genres", [...room.genres, nextTag]),
    });
    setRoomGenreInputs((current) => ({ ...current, [roomId]: "" }));
  };

  const handleRoomGenreKeyDown = (event: KeyboardEvent<HTMLInputElement>, roomId: string) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      handleRoomGenreCommit(roomId);
      return;
    }

    if (event.key === "Backspace" && (roomGenreInputs[roomId] ?? "") === "") {
      const room = value.rooms.find((item) => item.id === roomId);
      if (!room || room.genres.length === 0) {
        return;
      }

      onChange({
        ...value,
        rooms: updateRoom(value.rooms, roomId, "genres", room.genres.slice(0, -1)),
      });
    }
  };

  return (
    <section className="rounded-[var(--radius-surface)] border border-border bg-panel p-5">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5.5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-body-sm uppercase tracking-widerish text-muted">
                Cover completeness
              </p>
              <p className="text-body-sm text-muted">
                {completionCount}/{completionItems.length} fields
              </p>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-panel-2/70">
              <div
                className="h-full rounded-full bg-[var(--accent-hex)]/70 transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          <div>
            <label className="text-subheading uppercase tracking-widerish text-fg">
              Event Title
              <RequiredMark />
            </label>
            <Input
              value={value.title}
              placeholder="Event title"
              className="mt-1 text-body text-white/72"
              onChange={(event) =>
                onChange({
                  ...value,
                  title: event.target.value,
                })
              }
            />
            {errors.title ? (
              <p className="mt-1 text-body-sm text-[hsl(var(--warning))]">{errors.title}</p>
            ) : null}
          </div>

          <div>
            <label className="text-body uppercase tracking-widerish text-fg">
              Event Description
            </label>
            <textarea
              value={value.description}
              placeholder="Event description"
              rows={4}
              className="mt-1 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-3 text-body text-white/72 outline-none placeholder:text-body-sm placeholder:text-muted focus:border-[var(--accent-hex)]"
              onChange={(event) =>
                onChange({
                  ...value,
                  description: event.target.value,
                })
              }
            />
          </div>

          <div className="-mt-1 grid gap-4 md:grid-cols-[12rem_11rem_8.5rem_8.5rem]">
            <div>
              <label className="text-body uppercase tracking-widerish text-fg">
                Admission Mode
              </label>
              <DropdownSelect
                value={value.admissionMode}
                options={[
                  { value: "public", label: "Public" },
                  { value: "curated", label: "Curated" },
                ]}
                className="mt-1 h-8 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 text-body text-white/72"
                menuClassName="w-full"
                optionClassName="text-body"
                ariaLabel="Select admission mode"
                onChange={(nextValue) =>
                  onChange({
                    ...value,
                    admissionMode: nextValue as AdmissionMode,
                  })
                }
              />
            </div>

            <div>
              <label className="text-body uppercase tracking-widerish text-fg">
                Date
                <RequiredMark />
              </label>
              <DateTimeInput
                picker="date"
                value={value.date}
                onChange={(event) =>
                  onChange({
                    ...value,
                    date: event.target.value,
                  })
                }
              />
              {errors.date ? (
                <p className="mt-1 text-body-sm text-[hsl(var(--warning))]">{errors.date}</p>
              ) : null}
            </div>

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
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-body uppercase tracking-widerish text-fg">
                Location
                <RequiredMark />
              </label>
              <Input
                value={value.location}
                placeholder="Location"
                className="mt-1 text-body text-white/72"
                onChange={(event) =>
                  onChange({
                    ...value,
                    location: event.target.value,
                  })
                }
              />
              {errors.location ? (
                <p className="mt-1 text-body-sm text-[hsl(var(--warning))]">{errors.location}</p>
              ) : null}
            </div>

            <div>
              <label className="text-body uppercase tracking-widerish text-fg">
                Venue
              </label>
              <Input
                value={value.venue}
                placeholder="Venue"
                className="mt-1 text-body text-white/72"
                onChange={(event) =>
                  onChange({
                    ...value,
                    venue: event.target.value,
                  })
                }
              />
            </div>
          </div>

          <div>
            <div className="relative min-h-7">
              <label className="block pr-[11.5rem] text-body uppercase tracking-widerish text-fg">
                Genres / Styles
                <RequiredMark />
              </label>
              <div className="absolute right-0 top-1/2 w-[10.5rem] -translate-y-1/2">
                <DropdownSelect
                  value={value.genreDisplayMode}
                  options={[
                    { value: "event", label: "Event-wide" },
                    {
                      value: "room",
                      label: "By room",
                      disabled: value.rooms.length === 0,
                    },
                  ]}
                  className="h-7 w-[10.5rem] min-w-[10.5rem] max-w-[10.5rem] justify-end gap-1.5 rounded-[var(--radius-button-tag)] bg-transparent px-2.5 py-0 text-body-sm uppercase tracking-widerish text-fg transition hover:opacity-80"
                  labelClassName="flex-1 text-right"
                  menuClassName="w-[10.5rem] min-w-[10.5rem]"
                  optionClassName="whitespace-nowrap text-body-sm uppercase tracking-widerish"
                  ariaLabel="Select genre display mode"
                  onChange={(nextValue) =>
                    onChange({
                      ...value,
                      genreDisplayMode: nextValue as EventDisplayMode,
                    })
                  }
                />
              </div>
            </div>
            {errors.genres ? (
              <p className="mt-1 text-body-sm text-[hsl(var(--warning))]">{errors.genres}</p>
            ) : null}

            {value.genreDisplayMode === "event" ? (
              <div className="mt-1 rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  {value.genres.map((genre) => (
                    <MetaTag key={genre} className="gap-2">
                      <span>{genre}</span>
                      <button
                        type="button"
                        className="text-muted transition hover:text-fg"
                        onClick={() =>
                          onChange({
                            ...value,
                            genres: value.genres.filter((item) => item !== genre),
                          })
                        }
                      >
                        ×
                      </button>
                    </MetaTag>
                  ))}
                  <input
                    value={value.genreInput}
                    placeholder="Add genre or style"
                    className="min-w-[10rem] flex-1 bg-transparent text-body text-white/72 outline-none placeholder:text-body-sm placeholder:text-muted"
                    onChange={(event) =>
                      onChange({
                        ...value,
                        genreInput: event.target.value,
                      })
                    }
                    onBlur={handleGenreCommit}
                    onKeyDown={handleGenreKeyDown}
                  />
                </div>
              </div>
            ) : value.rooms.length === 0 ? (
              <div className="mt-1 rounded-[var(--radius-surface)] border border-dashed border-border bg-panel px-4 py-4 text-body-sm text-muted">
                Add rooms first to assign genres by room.
              </div>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-body uppercase tracking-widerish text-fg">
                Rooms
              </p>
              <button
                type="button"
                className="text-body-sm uppercase tracking-widerish transition hover:opacity-80"
                style={{ color: "var(--accent-hex)" }}
                onClick={() =>
                  onChange({
                    ...value,
                    rooms: [
                      ...value.rooms,
                      {
                        id: `room-${Date.now()}`,
                        name: "",
                        capacity: "",
                        genres: [],
                      },
                    ],
                  })
                }
              >
                Add Room
              </button>
            </div>

            {value.rooms.length === 0 ? (
              <div className="mt-1 rounded-[var(--radius-surface)] border border-dashed border-border bg-panel px-4 py-4 text-body-sm text-muted">
                Optional room breakdown for this event.
              </div>
            ) : (
              <div className="mt-1 space-y-3">
                {value.rooms.map((room, index) => (
                  <div
                    key={room.id}
                    className="rounded-[var(--radius-surface)] border border-border bg-panel p-3"
                  >
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_auto]">
                      <Input
                        value={room.name}
                        placeholder="Room name"
                        className="text-body text-white/72"
                        onChange={(event) =>
                          onChange({
                            ...value,
                            rooms: updateRoom(value.rooms, room.id, "name", event.target.value),
                          })
                        }
                      />
                      <Input
                        type="number"
                        value={room.capacity}
                        placeholder="Capacity"
                        className="text-body text-white/72"
                        onChange={(event) =>
                          onChange({
                            ...value,
                            rooms: updateRoom(
                              value.rooms,
                              room.id,
                              "capacity",
                              event.target.value,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="text-body-sm uppercase tracking-widerish text-muted transition hover:text-fg"
                        onClick={() =>
                          onChange({
                            ...value,
                            rooms: value.rooms.filter((item) => item.id !== room.id),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>

                    {value.genreDisplayMode === "room" ? (
                      <div className="mt-3 space-y-1">
                        <label className="text-body-sm uppercase tracking-widerish text-muted">
                          Genres / Styles
                        </label>
                        <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-1">
                          <div className="flex flex-wrap gap-2">
                            {room.genres.map((genre) => (
                              <MetaTag key={`${room.id}-${genre}`} className="gap-2">
                                <span>{genre}</span>
                                <button
                                  type="button"
                                  className="text-muted transition hover:text-fg"
                                  onClick={() =>
                                    onChange({
                                      ...value,
                                      rooms: updateRoom(
                                        value.rooms,
                                        room.id,
                                        "genres",
                                        room.genres.filter((item) => item !== genre),
                                      ),
                                    })
                                  }
                                >
                                  ×
                                </button>
                              </MetaTag>
                            ))}
                            <input
                              value={roomGenreInputs[room.id] ?? ""}
                              placeholder="Add genre or style"
                              className="min-w-[10rem] flex-1 bg-transparent py-0.5 text-body-sm leading-none text-white/72 outline-none placeholder:text-body-sm placeholder:text-muted"
                              onChange={(event) =>
                                setRoomGenreInputs((current) => ({
                                  ...current,
                                  [room.id]: event.target.value,
                                }))
                              }
                              onBlur={() => handleRoomGenreCommit(room.id)}
                              onKeyDown={(event) => handleRoomGenreKeyDown(event, room.id)}
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[var(--radius-surface)] border border-border bg-panel p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-body-lg uppercase tracking-widerish text-fg">
                  Poster Upload
                </p>
                <label className="cursor-pointer text-body-sm uppercase tracking-widerish text-[var(--accent-hex)] transition hover:opacity-80">
                  Select File
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              <div className="rounded-[var(--radius-surface)] border border-dashed border-border bg-bg p-3">
                <EventPoster
                  imageUrl={effectiveImageUrl || "/demo/event-covers/meridian-draft.svg"}
                  imageAlt={value.imageAlt || "Cover preview"}
                  aspectClassName="aspect-[2.2/1]"
                />
              </div>

              <p className="text-body-sm text-muted">
                Upload a cover image and preview it before the event is locked.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[var(--radius-surface)] border border-border bg-panel p-4">
            <div className="space-y-3">
              <p className="text-body-lg uppercase tracking-widerish text-fg">
                Card Preview
              </p>

              <EventCard
                variant="large"
                imageUrl={effectiveImageUrl || "/demo/event-covers/meridian-draft.svg"}
                imageAlt={value.imageAlt || "Event card preview"}
                date={value.date}
                title={value.title}
                lineupPreview={lineupPreview}
                footer={
                  <>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {value.location || "Location"}
                    </span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {value.venue || "Venue"}
                    </span>
                  </>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
