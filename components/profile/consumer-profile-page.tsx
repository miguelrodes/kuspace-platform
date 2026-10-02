"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { EventCard } from "@/components/events/event-card";
import { EventMetaRow } from "@/components/home/event-meta-row";
import { PublicTopNav } from "@/components/layout/public-top-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionNav } from "@/components/ui/section-nav";
import { profileEventGridClassName } from "@/components/office/event-card-variants";
import { useAppStore } from "@/lib/app-store";

const cityOptions = [
  "Northport",
  "Lumen Bay",
  "Greyhaven",
  "Solace Point",
] as const;

const MAX_PROFILE_GENRES = 5;

function ClerkLogoutButton() {
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      className="text-body text-fg block transition hover:text-[var(--accent-hex)]"
      onClick={() => {
        void signOut({ redirectUrl: "/" });
      }}
    >
      Log Out
    </button>
  );
}

function Avatar({
  firstName,
  lastName,
  avatarImageUrl,
}: {
  firstName: string;
  lastName: string;
  avatarImageUrl?: string;
}) {
  const normalizedAvatarImageUrl = avatarImageUrl || undefined;

  if (normalizedAvatarImageUrl) {
    return (
      <img
        src={normalizedAvatarImageUrl}
        alt={`${firstName} ${lastName}`}
        className="border-border h-36 w-36 rounded-full border object-cover"
      />
    );
  }

  return (
    <div className="border-border bg-panel relative h-36 w-36 overflow-hidden rounded-full border">
      <span
        aria-hidden="true"
        className="absolute top-[44%] left-1/2 h-px w-[140%] -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] bg-white/22"
      />
      <span
        aria-hidden="true"
        className="absolute top-[56%] left-1/2 h-px w-[140%] -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] bg-white/22"
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
  clerkEnabled,
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
  clerkEnabled: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      onClick={onClose}
    >
      <div
        className="border-border bg-panel max-h-[82vh] w-full max-w-xl overflow-y-auto rounded-[var(--radius-surface)] border p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-subheading tracking-[0.12em] text-[var(--accent-hex)] uppercase">
            Settings
          </h2>
        </div>

        <div className="mt-4 space-y-5">
          <div className="border-border space-y-4 border-b pb-5">
            <h3 className="text-body tracking-widerish text-fg uppercase">
              Personal Information
            </h3>

            <div>
              <label className="text-body text-muted">Email</label>
              <Input
                type="email"
                value={email}
                className="text-body mt-1 text-white/72"
                onChange={(event) => onEmailChange(event.target.value)}
              />
            </div>

            <div>
              <label className="text-body text-muted">Birthdate</label>
              <Input
                type="date"
                value={birthdate ?? ""}
                className="text-body mt-1 text-white/72"
                onChange={(event) => onBirthdateChange(event.target.value)}
              />
              <p className="text-body-sm text-muted mt-2">
                Private field. Not shown on the main profile.
              </p>
            </div>

            <div>
              <label className="text-body text-muted">Phone Number</label>
              <Input
                type="tel"
                value={phoneNumber ?? ""}
                className="text-body mt-1 text-white/72"
                onChange={(event) => onPhoneNumberChange(event.target.value)}
              />
            </div>
          </div>

          <div className="border-border space-y-4 border-b pb-5">
            <h3 className="text-body tracking-widerish text-fg uppercase">
              Notifications
            </h3>
            <div className="border-border bg-panel flex items-center justify-between gap-4 rounded-[var(--radius-surface)] border px-3 py-2">
              <p className="text-body text-fg">Event and ticket updates</p>
              <button
                type="button"
                className={`text-body-sm inline-flex h-7 min-w-[5.75rem] items-center justify-center rounded-[var(--radius-surface)] border px-2 tracking-[0.06em] uppercase transition ${
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

          <div className="border-border space-y-4 border-b pb-5">
            <h3 className="text-body tracking-widerish text-fg uppercase">
              Payment Methods
            </h3>
            <div className="border-border bg-panel rounded-[var(--radius-surface)] border px-3 py-2">
              <p className="text-body text-muted">
                No payment methods added yet.
              </p>
            </div>
            <button
              type="button"
              className="text-body text-[var(--accent-hex)] transition hover:opacity-80"
            >
              Manage payment methods
            </button>
          </div>

          <div className="border-border space-y-4 border-b pb-5">
            <h3 className="text-body tracking-widerish text-fg uppercase">
              Profile Settings
            </h3>
            <div className="border-border bg-panel flex items-center justify-between gap-4 rounded-[var(--radius-surface)] border px-3 py-2">
              <p className="text-body text-fg">Profile visibility</p>
              <div className="flex items-center gap-2">
                {(["public", "private"] as const).map((option) => {
                  const active = (profileVisibility ?? "public") === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`text-body-sm inline-flex h-7 min-w-[5.75rem] items-center justify-center rounded-[var(--radius-surface)] border px-2 tracking-[0.06em] uppercase transition ${
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
            <h3 className="text-body tracking-widerish text-fg uppercase">
              Account Actions
            </h3>
            {clerkEnabled ? (
              <ClerkLogoutButton />
            ) : (
              <Link
                href="/"
                className="text-body text-fg block transition hover:text-[var(--accent-hex)]"
              >
                Return Home
              </Link>
            )}
            <button
              type="button"
              className="text-body block text-[var(--accent-hex)] transition hover:opacity-80"
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
        <div className="border-border bg-panel absolute top-[calc(100%+0.35rem)] left-0 z-20 w-full rounded-[var(--radius-surface)] border p-1 shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`text-body block w-full rounded-[var(--radius-button-tag)] px-2 py-1.5 text-left transition ${
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
            <p className="text-body-sm text-muted px-2 py-1.5">
              No matching cities.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function EventLibraryContent({
  events,
  recruiterName,
  recruiterSlug,
}: {
  events: ReturnType<typeof useAppStore>["events"];
  recruiterName: string;
  recruiterSlug: string;
}) {
  return (
    <>
      {events.length === 0 ? (
        <p className="text-body-sm text-muted">
          No events in this section yet.
        </p>
      ) : (
        <div className="max-h-[25.5rem] overflow-y-auto pr-2">
          <div className="grid justify-start gap-y-4 xl:[grid-template-columns:repeat(5,13.25rem)] xl:gap-x-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                variant="medium"
                imageUrl={event.cover.imageUrl}
                imageAlt={event.cover.imageAlt}
                date={event.cover.date}
                title={event.cover.title}
                lineupPreview={event.lineup.entries
                  .map((entry) => entry.name)
                  .join(", ")}
                href={`/cons/events/${event.slug}`}
                hrefMode="overlay"
                ariaLabel={`View ${event.cover.title}`}
                footer={
                  <EventMetaRow
                    location={event.cover.location}
                    recruiterName={recruiterName}
                    recruiterSlug={recruiterSlug}
                    audience="consumer"
                  />
                }
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ArtistsSeenContent({ artists }: { artists: string[] }) {
  const [query, setQuery] = useState("");
  const filteredArtists = useMemo(() => {
    const sortedArtists = [...artists].sort((a, b) => a.localeCompare(b));

    if (!query.trim()) {
      return sortedArtists;
    }

    return sortedArtists.filter((artist) =>
      artist.toLowerCase().includes(query.trim().toLowerCase()),
    );
  }, [artists, query]);

  return (
    <div className="w-[11rem] space-y-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search artists"
        className="text-body-sm relative right-[2px] !h-7 w-full px-2.5"
      />

      {filteredArtists.length === 0 ? (
        <p className="text-body-sm text-muted">
          {artists.length === 0
            ? "No artists tracked yet."
            : "No artists match this search."}
        </p>
      ) : (
        <div className="text-body text-muted max-h-[23.75rem] w-full space-y-1 overflow-y-auto">
          {filteredArtists.map((artist) => (
            <p key={artist} className="truncate">
              {artist}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConsumerProfilePageView({
  clerkEnabled = false,
}: {
  clerkEnabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { events, profile, updateUser, getCurrentConsumerUser } = useAppStore();
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [genreInput, setGenreInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeEventSection, setActiveEventSection] = useState<
    "saved" | "upcoming" | "past"
  >("saved");
  const [showGenreInput, setShowGenreInput] = useState(false);

  const currentUser = getCurrentConsumerUser();
  const savedEventSlugs = useMemo(
    () => new Set(currentUser?.savedEventSlugs ?? []),
    [currentUser?.savedEventSlugs],
  );
  const upcomingTicketEventSlugs = useMemo(
    () => new Set(currentUser?.upcomingTicketEventSlugs ?? []),
    [currentUser?.upcomingTicketEventSlugs],
  );
  const pastTicketEventSlugs = useMemo(
    () => new Set(currentUser?.pastTicketEventSlugs ?? []),
    [currentUser?.pastTicketEventSlugs],
  );
  const { savedEvents, upcomingEvents, pastEvents, checkedInPastEvents } =
    useMemo(() => {
      const nextSavedEvents: typeof events = [];
      const nextUpcomingEvents: typeof events = [];
      const nextPastEvents: typeof events = [];
      const nextCheckedInPastEvents: typeof events = [];

      events.forEach((event) => {
        if (savedEventSlugs.has(event.slug)) {
          nextSavedEvents.push(event);
        }

        if (
          upcomingTicketEventSlugs.has(event.slug) &&
          event.status !== "past"
        ) {
          nextUpcomingEvents.push(event);
        }

        if (pastTicketEventSlugs.has(event.slug) && event.status === "past") {
          nextPastEvents.push(event);

          const checkedInByAssignment = event.accessAssignments.some(
            (assignment) =>
              assignment.userId === currentUser?.id && assignment.checkedIn,
          );
          const checkedInByGuestlist = event.guestlist.entries.some(
            (entry) =>
              entry.checkedIn &&
              ("userId" in entry
                ? entry.userId === currentUser?.id
                : entry.userId === currentUser?.id),
          );

          if (checkedInByAssignment || checkedInByGuestlist) {
            nextCheckedInPastEvents.push(event);
          }
        }
      });

      return {
        savedEvents: nextSavedEvents,
        upcomingEvents: nextUpcomingEvents,
        pastEvents: nextPastEvents,
        checkedInPastEvents: nextCheckedInPastEvents,
      };
    }, [
      currentUser?.id,
      events,
      pastTicketEventSlugs,
      savedEventSlugs,
      upcomingTicketEventSlugs,
    ]);
  const sourceEventsForArtistsSeen =
    checkedInPastEvents.length > 0 ? checkedInPastEvents : pastEvents;
  const artistsSeen = useMemo(() => {
    const deduped = new Set<string>();

    sourceEventsForArtistsSeen.forEach((event) => {
      event.lineup.entries.forEach((entry) => {
        const nextName = entry.name.trim();
        if (nextName) {
          deduped.add(nextName);
        }
      });
    });

    return Array.from(deduped);
  }, [sourceEventsForArtistsSeen]);
  const activeEvents =
    activeEventSection === "saved"
      ? savedEvents
      : activeEventSection === "upcoming"
        ? upcomingEvents
        : pastEvents;

  if (!hasHydrated) {
    return (
      <div className="bg-bg text-fg min-h-screen">
        <PublicTopNav
          title="Nightlife Ops System"
          subtitle="Clubs, Brands, Collectives"
        />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="bg-bg text-fg min-h-screen">
        <PublicTopNav
          title="Nightlife Ops System"
          subtitle="Clubs, Brands, Collectives"
        />
        <main className="px-4 py-8 md:px-6">
          <div className="border-border bg-panel mx-auto w-full max-w-none rounded-[var(--radius-surface)] border p-6">
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

    if (
      favoriteGenres.some(
        (genre) => genre.toLowerCase() === nextGenre.toLowerCase(),
      )
    ) {
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
    <div className="bg-bg text-fg min-h-screen">
      <PublicTopNav
        title="Nightlife Ops System"
        subtitle="Clubs, Brands, Collectives"
      />

      <main className="px-4 py-8 md:px-6">
        <div className="mx-auto w-full max-w-none space-y-2">
          <section className="border-border bg-panel rounded-[var(--radius-surface)] border px-5 pt-5 pb-1">
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
                      <div className="flex w-36 translate-x-[4px] justify-center">
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
                          className="text-body-sm h-8 px-0 tracking-[0.12em] uppercase"
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
                        <div className="max-w-sm sm:col-span-2">
                          <label className="text-body tracking-widerish text-fg uppercase">
                            Username
                          </label>
                          <Input
                            value={currentUser.username}
                            className="text-body mt-1 text-white/72"
                            onChange={(event) =>
                              updateUser({
                                id: currentUser.id,
                                username: event.target.value.toLowerCase(),
                              })
                            }
                          />
                        </div>

                        <div>
                          <label className="text-body tracking-widerish text-fg uppercase">
                            First Name
                          </label>
                          <Input
                            value={currentUser.firstName}
                            className="text-body mt-1 text-white/72"
                            onChange={(event) =>
                              updateUser({
                                id: currentUser.id,
                                firstName: event.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <label className="text-body tracking-widerish text-fg uppercase">
                            Last Name
                          </label>
                          <Input
                            value={currentUser.lastName}
                            className="text-body mt-1 text-white/72"
                            onChange={(event) =>
                              updateUser({
                                id: currentUser.id,
                                lastName: event.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-body tracking-widerish text-fg uppercase">
                            City
                          </label>
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
                      <div className="space-y-1.5">
                        <p className="text-subheading text-fg">
                          @{currentUser.username}
                        </p>
                        <div
                          className="text-heading-sm text-fg flex flex-wrap items-center gap-x-3 gap-y-1"
                          style={{ fontFamily: "var(--font-space-grotesk)" }}
                        >
                          <p>{currentUser.firstName}</p>
                          <p>{currentUser.lastName}</p>
                        </div>
                        <p className="text-fg text-lg">{currentUser.city}</p>
                      </div>
                    )}

                    <div className="space-y-1.5 pt-0">
                      <p className="text-fg text-lg tracking-[0.04em]">
                        Genres
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        {favoriteGenres.map((genre) => (
                          <span
                            key={genre}
                            className="border-border bg-panel text-body-sm tracking-widerish text-fg inline-flex items-center gap-2 rounded-[var(--radius-button-tag)] border px-2.5 py-0 leading-none"
                          >
                            <span>{genre}</span>
                            {isEditing ? (
                              <button
                                type="button"
                                className="text-muted hover:text-fg transition"
                                onClick={() =>
                                  updateGenres(
                                    favoriteGenres.filter(
                                      (currentGenre) => currentGenre !== genre,
                                    ),
                                  )
                                }
                                aria-label={`Remove ${genre}`}
                              >
                                ×
                              </button>
                            ) : null}
                          </span>
                        ))}
                        {isEditing &&
                        !showGenreInput &&
                        favoriteGenres.length < MAX_PROFILE_GENRES ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-body-sm h-7 px-0 tracking-[0.12em] uppercase"
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
                              onChange={(event) =>
                                setGenreInput(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  handleGenreSubmit();
                                }
                              }}
                            />
                            <p className="text-body-sm text-muted mt-2">
                              Up to {MAX_PROFILE_GENRES} genres.
                            </p>
                          </div>
                        ) : null
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="ml-auto flex translate-x-3 items-center gap-px">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-body-sm h-8 px-0 tracking-[0.12em] uppercase"
                    style={{ color: "var(--accent-hex)" }}
                    onClick={() => setIsEditing((current) => !current)}
                  >
                    {isEditing ? "Done" : "Edit Profile"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-body-sm h-8 px-0 tracking-[0.12em] uppercase"
                    style={{ color: "var(--accent-hex)" }}
                    onClick={() => setSettingsOpen(true)}
                  >
                    Settings
                  </Button>
                </div>
              </div>
            </div>
            <div className="pt-7">
              <div className="grid gap-0 xl:grid-cols-[69.25rem_12rem] xl:justify-start">
                <div className="space-y-3 xl:pr-0">
                  <SectionNav
                    items={["SAVED", "UPCOMING", "PAST"]}
                    activeItem={activeEventSection.toUpperCase()}
                    onChange={(item) =>
                      setActiveEventSection(
                        item.toLowerCase() as "saved" | "upcoming" | "past",
                      )
                    }
                  />

                  <EventLibraryContent
                    events={activeEvents}
                    recruiterName={profile.displayName}
                    recruiterSlug={profile.slug}
                  />
                </div>

                <div
                  className="xl:ml-10 xl:self-stretch xl:pl-10"
                  style={{
                    backgroundImage:
                      "linear-gradient(hsl(var(--border)), hsl(var(--border)))",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "left 0 top 2.6rem",
                    backgroundSize: "1px calc(100% - 2.6rem)",
                  }}
                >
                  <div className="space-y-3 xl:w-fit">
                    <h2
                      className="text-body-lg relative top-[7px] text-left tracking-[0.01em] uppercase"
                      style={{ color: "#FFFFFF" }}
                    >
                      Artists Seen
                    </h2>
                    <ArtistsSeenContent artists={artistsSeen} />
                  </div>
                </div>
              </div>
            </div>
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
          clerkEnabled={clerkEnabled}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </div>
  );
}
