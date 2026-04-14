"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { PublicTopNav } from "@/components/layout/public-top-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventFeedCard } from "@/components/home/event-feed-card";
import { SectionNav } from "@/components/ui/section-nav";
import { defaultConsumerUserId } from "@/lib/mock-data";
import { useMockEventsStore } from "@/lib/mock-store";

const cityOptions = [
  "Northport",
  "Barcelona, Spain",
  "Madrid, Spain",
  "Valencia, Spain",
  "Palma, Spain",
  "London, UK",
  "Paris, France",
  "Berlin, Germany",
] as const;

const MAX_PROFILE_GENRES = 5;

function Avatar({
  firstName,
  lastName,
  avatarImageUrl,
}: {
  firstName: string;
  lastName: string;
  avatarImageUrl?: string;
}) {
  const normalizedAvatarImageUrl =
    avatarImageUrl && !avatarImageUrl.startsWith("/mock/users/")
      ? avatarImageUrl
      : undefined;

  if (normalizedAvatarImageUrl) {
    return (
      <img
        src={normalizedAvatarImageUrl}
        alt={`${firstName} ${lastName}`}
        className="h-24 w-24 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <div className="relative h-24 w-24 overflow-hidden rounded-full border border-border bg-panel">
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-[44%] h-px w-[140%] -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] bg-white/22"
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-[56%] h-px w-[140%] -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] bg-white/22"
      />
    </div>
  );
}

function SettingsModal({
  email,
  birthdate,
  phoneNumber,
  profileVisibility,
  notificationsEnabled,
  onEmailChange,
  onBirthdateChange,
  onPhoneNumberChange,
  onProfileVisibilityChange,
  onNotificationsChange,
  onClose,
}: {
  email: string;
  birthdate?: string;
  phoneNumber?: string;
  profileVisibility?: "public" | "private";
  notificationsEnabled?: boolean;
  onEmailChange: (nextEmail: string) => void;
  onBirthdateChange: (nextBirthdate: string) => void;
  onPhoneNumberChange: (nextPhoneNumber: string) => void;
  onProfileVisibilityChange: (nextVisibility: "public" | "private") => void;
  onNotificationsChange: (nextValue: boolean) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
      <div
        className="max-h-[82vh] w-full max-w-xl overflow-y-auto rounded-[var(--radius-surface)] border border-border bg-panel p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-subheading uppercase tracking-[0.12em] text-[var(--accent-hex)]">
            Settings
          </h2>
          <button
            type="button"
            className="text-body text-muted transition hover:text-fg"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-5">
          <div className="space-y-4 border-b border-border pb-5">
            <h3 className="text-body uppercase tracking-widerish text-fg">Personal Information</h3>

            <div>
              <label className="text-body text-muted">Email</label>
              <Input
                type="email"
                value={email}
                className="mt-1 text-body text-white/72"
                onChange={(event) => onEmailChange(event.target.value)}
              />
            </div>

            <div>
              <label className="text-body text-muted">Birthdate</label>
              <Input
                type="date"
                value={birthdate ?? ""}
                className="mt-1 text-body text-white/72"
                onChange={(event) => onBirthdateChange(event.target.value)}
              />
              <p className="mt-2 text-body-sm text-muted">Private field. Not shown on the main profile.</p>
            </div>

            <div>
              <label className="text-body text-muted">Phone Number</label>
              <Input
                type="tel"
                value={phoneNumber ?? ""}
                className="mt-1 text-body text-white/72"
                onChange={(event) => onPhoneNumberChange(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4 border-b border-border pb-5">
            <h3 className="text-body uppercase tracking-widerish text-fg">Notifications</h3>
            <div className="flex items-center justify-between gap-4 rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-2">
              <p className="text-body text-fg">Event and ticket updates</p>
              <button
                type="button"
                className={`inline-flex h-7 min-w-[5.75rem] items-center justify-center rounded-[var(--radius-surface)] border px-2 text-body-sm uppercase tracking-[0.06em] transition ${
                  notificationsEnabled
                    ? "border-[var(--accent-hex)] text-[var(--accent-hex)]"
                    : "border-border text-muted"
                }`}
                onClick={() => onNotificationsChange(!notificationsEnabled)}
              >
                {notificationsEnabled ? "On" : "Off"}
              </button>
            </div>
          </div>

          <div className="space-y-4 border-b border-border pb-5">
            <h3 className="text-body uppercase tracking-widerish text-fg">Payment Methods</h3>
            <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-2">
              <p className="text-body text-muted">No payment methods added yet.</p>
            </div>
            <button
              type="button"
              className="text-body text-[var(--accent-hex)] transition hover:opacity-80"
            >
              Manage payment methods
            </button>
          </div>

          <div className="space-y-4 border-b border-border pb-5">
            <h3 className="text-body uppercase tracking-widerish text-fg">Profile Settings</h3>
            <div className="flex items-center justify-between gap-4 rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-2">
              <p className="text-body text-fg">Profile visibility</p>
              <div className="flex items-center gap-2">
                {(["public", "private"] as const).map((option) => {
                  const active = (profileVisibility ?? "public") === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`inline-flex h-7 min-w-[5.75rem] items-center justify-center rounded-[var(--radius-surface)] border px-2 text-body-sm uppercase tracking-[0.06em] transition ${
                        active
                          ? "border-[var(--accent-hex)] text-[var(--accent-hex)]"
                          : "border-border text-muted"
                      }`}
                      onClick={() => onProfileVisibilityChange(option)}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-body uppercase tracking-widerish text-fg">Account Actions</h3>
            <button
              type="button"
              className="block text-body text-fg transition hover:text-[var(--accent-hex)]"
            >
              Log Out
            </button>
            <button
              type="button"
              className="block text-body text-[var(--accent-hex)] transition hover:opacity-80"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CityCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (nextValue: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const filteredOptions = cityOptions.filter((option) =>
    option.toLowerCase().includes(value.trim().toLowerCase()),
  );

  return (
    <div ref={rootRef} className="relative mt-1 max-w-sm">
      <Input
        value={value}
        placeholder="Search city"
        className="text-body text-white/72"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
      />

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.35rem)] z-20 w-full rounded-[var(--radius-surface)] border border-border bg-panel p-1 shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`block w-full rounded-[var(--radius-button-tag)] px-2 py-1.5 text-left text-body transition ${
                  option === value
                    ? "bg-panel-2 text-fg"
                    : "text-muted hover:bg-panel-2 hover:text-fg"
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))
          ) : (
            <p className="px-2 py-1.5 text-body-sm text-muted">No matching cities.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function EventLibraryPanel({
  activeSection,
  onSectionChange,
  events,
}: {
  activeSection: "saved" | "upcoming" | "past";
  onSectionChange: (section: "saved" | "upcoming" | "past") => void;
  events: ReturnType<typeof useMockEventsStore>["events"];
}) {
  const { profile } = useMockEventsStore();
  const sectionItems = ["SAVED", "UPCOMING", "PAST"];

  return (
    <div className="space-y-4 pt-8">
      <SectionNav
        items={sectionItems}
        activeItem={activeSection.toUpperCase()}
        onChange={(item) => onSectionChange(item.toLowerCase() as "saved" | "upcoming" | "past")}
      />

      {events.length === 0 ? (
        <p className="text-body-sm text-muted">No events in this section yet.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4 px-1">
            {events.map((event) => (
              <div key={event.id} className="w-[18rem] shrink-0">
                <EventFeedCard
                  event={event}
                  recruiter={profile}
                  audience="consumer"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ConsumerProfilePageView() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { users, events, updateUser } = useMockEventsStore();
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [genreInput, setGenreInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeEventSection, setActiveEventSection] = useState<"saved" | "upcoming" | "past">("saved");
  const [showGenreInput, setShowGenreInput] = useState(false);

  const currentUser = users.find((user) => user.id === defaultConsumerUserId) ?? users[0];

  const savedEvents = useMemo(
    () => events.filter((event) => currentUser?.savedEventSlugs?.includes(event.slug)),
    [currentUser?.savedEventSlugs, events],
  );
  const upcomingEvents = useMemo(
    () => events.filter((event) => currentUser?.upcomingTicketEventSlugs?.includes(event.slug)),
    [currentUser?.upcomingTicketEventSlugs, events],
  );
  const pastEvents = useMemo(
    () => events.filter((event) => currentUser?.pastTicketEventSlugs?.includes(event.slug)),
    [currentUser?.pastTicketEventSlugs, events],
  );
  const activeEvents = activeEventSection === "saved"
    ? savedEvents
    : activeEventSection === "upcoming"
      ? upcomingEvents
      : pastEvents;

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-bg text-fg">
        <PublicTopNav title="Nightlife Ops System" subtitle="Clubs, Brands, Collectives" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-bg text-fg">
        <PublicTopNav title="Nightlife Ops System" subtitle="Clubs, Brands, Collectives" />
        <main className="px-4 py-8 md:px-6">
          <div className="mx-auto max-w-6xl rounded-[var(--radius-surface)] border border-border bg-panel p-6">
            <p className="text-body text-muted">Profile not found.</p>
          </div>
        </main>
      </div>
    );
  }

  const favoriteGenres = currentUser.favoriteGenres ?? [];

  const updateGenres = (nextGenres: string[]) => {
    updateUser({
      id: currentUser.id,
      favoriteGenres: nextGenres,
    });
  };

  const handleGenreSubmit = () => {
    const nextGenre = genreInput.trim();
    if (!nextGenre) {
      return;
    }

    if (favoriteGenres.length >= MAX_PROFILE_GENRES) {
      setGenreInput("");
      setShowGenreInput(false);
      return;
    }

    if (favoriteGenres.some((genre) => genre.toLowerCase() === nextGenre.toLowerCase())) {
      setGenreInput("");
      return;
    }

    updateGenres([...favoriteGenres, nextGenre]);
    setGenreInput("");
    setShowGenreInput(false);
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateUser({
          id: currentUser.id,
          avatarImageUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="min-h-screen bg-bg text-fg">
      <PublicTopNav title="Nightlife Ops System" subtitle="Clubs, Brands, Collectives" />

      <main className="px-4 py-8 md:px-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="rounded-[var(--radius-surface)] border border-border bg-panel p-5">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-6 pl-4">
                  <div className="space-y-2">
                    <Avatar
                      firstName={currentUser.firstName}
                      lastName={currentUser.lastName}
                      avatarImageUrl={currentUser.avatarImageUrl}
                    />
                    {isEditing ? (
                      <div className="flex w-24 justify-center translate-x-[4px]">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-0 text-body-sm uppercase tracking-[0.12em]"
                          style={{ color: "var(--accent-hex)" }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change Photo
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 pl-4">
                    {isEditing ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2 max-w-sm">
                          <label className="text-body uppercase tracking-widerish text-fg">Username</label>
                          <Input
                            value={currentUser.username}
                            className="mt-1 text-body text-white/72"
                            onChange={(event) =>
                              updateUser({
                                id: currentUser.id,
                                username: event.target.value.toLowerCase(),
                              })
                            }
                          />
                        </div>

                        <div>
                          <label className="text-body uppercase tracking-widerish text-fg">First Name</label>
                          <Input
                            value={currentUser.firstName}
                            className="mt-1 text-body text-white/72"
                            onChange={(event) =>
                              updateUser({
                                id: currentUser.id,
                                firstName: event.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <label className="text-body uppercase tracking-widerish text-fg">Last Name</label>
                          <Input
                            value={currentUser.lastName}
                            className="mt-1 text-body text-white/72"
                            onChange={(event) =>
                              updateUser({
                                id: currentUser.id,
                                lastName: event.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-body uppercase tracking-widerish text-fg">City</label>
                          <CityCombobox
                            value={currentUser.city ?? ""}
                            onChange={(nextCity) =>
                              updateUser({
                                id: currentUser.id,
                                city: nextCity,
                              })
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-subheading text-fg">@{currentUser.username}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-lg text-fg">
                          <p>{currentUser.firstName}</p>
                          <p>{currentUser.lastName}</p>
                        </div>
                        <p className="text-body text-fg">{currentUser.city}</p>
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      <p className="text-lg tracking-[0.04em] text-fg">Genres</p>

                      <div className="flex flex-wrap items-center gap-2">
                        {favoriteGenres.map((genre) => (
                          <span
                            key={genre}
                            className="inline-flex items-center gap-2 rounded-[var(--radius-button-tag)] border border-border bg-panel px-2.5 py-0 text-body-sm leading-none tracking-widerish text-fg"
                          >
                            <span>{genre}</span>
                            {isEditing ? (
                              <button
                                type="button"
                                className="text-muted transition hover:text-fg"
                                onClick={() =>
                                  updateGenres(
                                    favoriteGenres.filter((currentGenre) => currentGenre !== genre),
                                  )
                                }
                                aria-label={`Remove ${genre}`}
                              >
                                ×
                              </button>
                            ) : null}
                          </span>
                        ))}
                        {isEditing && !showGenreInput && favoriteGenres.length < MAX_PROFILE_GENRES ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-7 px-0 text-body-sm uppercase tracking-[0.12em]"
                            style={{ color: "var(--accent-hex)" }}
                            onClick={() => setShowGenreInput(true)}
                          >
                            Add Genre
                          </Button>
                        ) : null}
                      </div>

                      {isEditing ? (
                        showGenreInput ? (
                          <div className="max-w-md">
                            <Input
                              value={genreInput}
                              placeholder="Add genre"
                              className="text-body text-white/72"
                              onChange={(event) => setGenreInput(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  handleGenreSubmit();
                                }
                              }}
                            />
                            <p className="mt-2 text-body-sm text-muted">
                              Up to {MAX_PROFILE_GENRES} genres.
                            </p>
                          </div>
                        ) : null
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-0 text-body-sm uppercase tracking-[0.12em]"
                    style={{ color: "var(--accent-hex)" }}
                    onClick={() => setIsEditing((current) => !current)}
                  >
                    {isEditing ? "Done" : "Edit Profile"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-0 text-body-sm uppercase tracking-[0.12em]"
                    style={{ color: "var(--accent-hex)" }}
                    onClick={() => setSettingsOpen(true)}
                  >
                    Settings
                  </Button>
                </div>
              </div>
            </div>
              <EventLibraryPanel
                activeSection={activeEventSection}
                onSectionChange={setActiveEventSection}
                events={activeEvents}
              />
          </section>
        </div>
      </main>

      {settingsOpen ? (
        <SettingsModal
          email={currentUser.email}
          birthdate={currentUser.birthdate}
          phoneNumber={currentUser.phoneNumber}
          profileVisibility={currentUser.profileVisibility}
          notificationsEnabled={currentUser.notificationsEnabled}
          onEmailChange={(nextEmail) =>
            updateUser({
              id: currentUser.id,
              email: nextEmail,
            })
          }
          onBirthdateChange={(nextBirthdate) =>
            updateUser({
              id: currentUser.id,
              birthdate: nextBirthdate,
            })
          }
          onPhoneNumberChange={(nextPhoneNumber) =>
            updateUser({
              id: currentUser.id,
              phoneNumber: nextPhoneNumber,
            })
          }
          onProfileVisibilityChange={(nextVisibility) =>
            updateUser({
              id: currentUser.id,
              profileVisibility: nextVisibility,
            })
          }
          onNotificationsChange={(nextValue) =>
            updateUser({
              id: currentUser.id,
              notificationsEnabled: nextValue,
            })
          }
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </div>
  );
}
