"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EventPoster } from "@/components/home/event-poster";
import { EventFeedCard } from "@/components/home/event-feed-card";
import { PublicTopNav } from "@/components/layout/public-top-nav";
import { RecruiterTopNav } from "@/components/layout/recruiter-top-nav";
import { ConfirmDialog } from "@/components/ui/action-dialog";
import {
  canConsumerAccessEvent,
  canRecruiterAccessEventPreview,
  getPublicEventCollection,
  isPublicEventStatus,
} from "@/lib/event-status";
import {
  getEventAccessAssignment,
  getEventApplication,
  getVisibleTicketSectionsForUser,
} from "@/lib/event-access";
import { defaultConsumerUserId } from "@/lib/mock-data";
import { useMockEventsStore } from "@/lib/mock-store";
import { formatTimeRange } from "@/lib/utils/date";
import type { Event, TicketSection } from "@/types/event";

type PublicEventDetailPageProps = {
  slug: string;
  audience?: "consumer" | "recruiter";
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function formatDisplayLocation(location: string) {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 2) return location;
  return parts.slice(0, 3).join(", ");
}

function getMapHref(event: Event) {
  const encoded = encodeURIComponent(`${event.cover.venue}, ${event.cover.location}`);
  return `https://maps.google.com/?q=${encoded}`;
}

function getRelatedEvents(currentEvent: Event, events: Event[]) {
  const currentGenres = new Set(currentEvent.cover.genres.map((genre) => genre.toLowerCase()));

  return events
    .filter((event) => event.id !== currentEvent.id)
    .filter((event) => event.recruiterProfileId === currentEvent.recruiterProfileId)
    .filter((event) =>
      event.cover.genres.some((genre) => currentGenres.has(genre.toLowerCase())),
    )
    .sort((a, b) => {
      const statusWeight = (status: Event["status"]) => {
        if (status === "upcoming") return 0;
        if (status === "live") return 1;
        if (status === "past") return 2;
        return 3;
      };

      return (
        statusWeight(a.status) - statusWeight(b.status) ||
        a.cover.date.localeCompare(b.cover.date)
      );
    })
    .slice(0, 4);
}

function getRoomGenreGroups(event: Event) {
  return (event.cover.rooms ?? [])
    .map((room) => ({
      id: room.id,
      name: room.name,
      genres: room.genres ?? [],
    }))
    .filter((room) => room.genres.length > 0);
}

function getRoomLineupGroups(event: Event) {
  return (event.cover.rooms ?? [])
    .map((room) => ({
      id: room.id,
      name: room.name,
      entries: event.lineup.entries.filter(
        (entry) => entry.roomId === room.id || entry.roomIds?.includes(room.id),
      ),
    }))
    .filter((room) => room.entries.length > 0);
}

function TicketSectionBlock({
  section,
  onPurchase,
}: {
  section: TicketSection;
  onPurchase: (sectionId: string) => void;
}) {
  const activePhaseId = section.phases.find((phase) => phase.status === "live")?.id;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-body-lg uppercase tracking-widerish text-[#FFFFFF]">
          {section.name}
        </h3>
      </div>

      <div className="-mx-1 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3 px-1">
        {section.phases.map((phase) => {
          const isActive = phase.id === activePhaseId;
          const isMutedPhase = phase.status !== "live";

          return (
            <div
              key={phase.id}
              className={`w-[11.25rem] shrink-0 rounded-[var(--radius-surface)] border px-3 py-2 ${
                isActive
                  ? "bg-panel"
                  : "border-border bg-panel"
              } ${phase.status === "sold_out" ? "opacity-60" : ""} ${
                phase.status === "upcoming" ? "opacity-90" : ""
              }`}
              style={isActive ? { borderColor: "var(--accent-hex)" } : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <p
                  className={`truncate whitespace-nowrap text-body-lg uppercase tracking-widerish ${
                    isMutedPhase ? "text-white/70" : "text-fg"
                  }`}
                >
                  {phase.name}
                </p>
              </div>

              <div className="mt-1.5 border-t border-border" />

              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <p className={`text-body ${phase.status === "live" ? "text-[#FFFFFF]" : "text-muted"}`}>Price</p>
                  <p className={`text-body ${isMutedPhase ? "text-white/70" : "text-fg"}`}>
                    {formatCurrency(phase.price)}
                  </p>
                </div>
              </div>

              {phase.status === "sold_out" ? (
                <div className="mt-2.5 flex min-h-[1.35rem] items-end justify-center">
                  <p className="text-body-sm text-muted">Sold Out</p>
                </div>
              ) : null}

              {phase.status === "live" ? (
                <div className="mt-2.5 flex min-h-[1.35rem] items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 border border-[#FFFFFF] bg-transparent px-2.5 text-body-sm uppercase tracking-[0.08em] hover:bg-transparent"
                    style={{ color: "var(--accent-hex)" }}
                    onClick={() => onPurchase(section.id)}
                  >
                    Get Tickets
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      </div>
    </section>
  );
}

export function PublicEventDetailPage({
  slug,
  audience = "consumer",
}: PublicEventDetailPageProps) {
  const router = useRouter();
  const {
    profile,
    users,
    events,
    getEventBySlug,
    applyToCuratedEvent,
    purchaseTicketSection,
  } = useMockEventsStore();
  const [showApplyDialog, setShowApplyDialog] = useState(false);

  const event = getEventBySlug(slug);
  const currentConsumer = users.find((user) => user.id === defaultConsumerUserId) ?? users[0];

  useEffect(() => {
    if (!event) {
      return;
    }

    const canAccess =
      audience === "consumer"
        ? canConsumerAccessEvent(event)
        : canRecruiterAccessEventPreview(event);

    if (!canAccess) {
      router.replace(audience === "recruiter" ? "/rechome" : "/");
    }
  }, [audience, event, router]);

  const recruiter = profile;

  const relatedEvents = useMemo(
    () => {
      if (!event) {
        return [];
      }

      const sourceEvents =
        audience === "consumer" ? getPublicEventCollection(events) : events;

      return getRelatedEvents(event, sourceEvents);
    },
    [audience, event, events],
  );

  if (
    !event ||
    (audience === "consumer" && !canConsumerAccessEvent(event)) ||
    (audience === "recruiter" && !canRecruiterAccessEventPreview(event))
  ) {
    return (
      <div className="min-h-screen bg-bg text-fg">
        {audience === "recruiter" ? (
          <RecruiterTopNav />
        ) : (
          <PublicTopNav title="Nightlife Office" subtitle="Public Event Network" />
        )}
        <main className="px-4 py-8 md:px-6">
          <div className="mx-auto max-w-6xl rounded-[var(--radius-surface)] border border-border bg-panel p-6">
            <p className="text-body-lg text-fg">
              {audience === "consumer"
                ? "This event is not available publicly."
                : "This event preview is not available yet."}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const promoters = event.promoters?.length
    ? event.promoters
    : [
        {
          id: recruiter.id,
          name: recruiter.displayName,
          profileSlug: recruiter.slug,
          avatarImageUrl: recruiter.media?.avatarImageUrl,
        },
      ];
  const recruiterProfileHref =
    audience === "recruiter"
      ? `/recprofile/${recruiter.slug}`
      : `/cons/profile/${recruiter.slug}`;
  const currentAssignment =
    audience === "consumer" ? getEventAccessAssignment(event, currentConsumer?.id) : undefined;
  const currentApplication =
    audience === "consumer" ? getEventApplication(event, currentConsumer?.id) : undefined;

  const visibleTicketSections =
    audience === "consumer"
      ? getVisibleTicketSectionsForUser(event, currentConsumer?.id)
      : (event.tickets.sections ?? []).filter(
          (section) => section.visibility !== "hidden" && section.phases.length > 0,
        );
  const showTicketsSection =
    isPublicEventStatus(event.status) &&
    event.status !== "past" &&
    visibleTicketSections.length > 0;
  const showCuratedAccessPanel =
    audience === "consumer" &&
    event.admissionMode === "curated" &&
    event.status === "live";
  return (
    <div className="min-h-screen bg-bg text-fg">
      {audience === "recruiter" ? (
        <RecruiterTopNav />
      ) : (
        <PublicTopNav title="Nightlife Office" subtitle="Public Event Network" />
      )}

      <main className="px-4 py-8 md:px-6">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-[var(--radius-surface)] border border-border bg-panel p-5 md:p-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] xl:items-start">
              <div className="space-y-6">
                <div className="max-w-[31rem]">
                  <EventPoster
                    imageUrl={event.cover.imageUrl}
                    imageAlt={event.cover.imageAlt}
                    aspectClassName="aspect-[16/10]"
                  />
                </div>

                <div className="max-w-[31rem] space-y-3">
                  <p className="text-body-lg uppercase tracking-widerish text-[#FFFFFF]">
                    Event Overview
                  </p>
                  <p className="text-body text-white/78">
                    {event.cover.description || event.cover.shortDescription || "Event details coming soon."}
                  </p>
                </div>

              </div>

		              <div className="space-y-5">
		                <div className="flex flex-wrap items-center justify-between gap-4">
		                  <div className="space-y-1">
		                    <h1 className="text-title font-medium tracking-tightish text-fg">
		                      {event.cover.title}
		                    </h1>
		                  </div>

	                  <div>
	                    <div className="flex items-center gap-3">
	                      <Link
	                        href={recruiterProfileHref}
	                        className="h-12 w-12 overflow-hidden rounded-full border border-border bg-panel"
                      >
                        <div
                          className="h-full w-full bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${recruiter.media?.avatarImageUrl ?? ""})`,
                          }}
                        />
                      </Link>
                      <div className="flex min-h-[3rem] items-center">
                        <Link
                          href={recruiterProfileHref}
                          className="text-subheading text-fg transition hover:text-[var(--accent-hex)]"
                        >
                          {recruiter.displayName}
                        </Link>
                      </div>
	                    </div>
	                  </div>
	                </div>

	                <div className="grid gap-4 sm:grid-cols-[minmax(0,1.45fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
	                  <div className="min-w-0 space-y-1">
	                    <p className="text-body-sm uppercase tracking-widerish text-muted">Location</p>
	                    <p className="text-body text-fg">
	                      {event.cover.venue},{" "}
	                      <span className="text-body-sm text-white/78">
	                        {formatDisplayLocation(event.cover.location)}
	                      </span>
	                    </p>
	                    <a
	                      href={getMapHref(event)}
	                      target="_blank"
	                      rel="noreferrer"
	                      className="inline-block text-body-sm transition hover:opacity-80"
	                      style={{ color: "var(--accent-hex)" }}
	                    >
	                      Open in Maps
	                    </a>
	                  </div>

	                  <div className="min-w-0 space-y-1">
	                    <p className="text-body-sm uppercase tracking-widerish text-muted">Date</p>
	                    <p className="text-body text-fg">{formatDisplayDate(event.cover.date)}</p>
	                  </div>

	                  <div className="min-w-0 space-y-1">
	                    <p className="text-body-sm uppercase tracking-widerish text-muted">Time</p>
	                    <p className="text-body text-fg">
	                      {formatTimeRange(event.cover.time?.start, event.cover.time?.end) || "TBA"}
	                    </p>
	                  </div>
	                </div>

	                <div className="space-y-1">
	                  <p className="text-body-lg uppercase tracking-widerish text-[#FFFFFF]">
	                    Lineup
	                  </p>
                    {event.lineup.displayMode === "room" ? (
                      <div className="space-y-2">
                        {getRoomLineupGroups(event).length > 0 ? (
                          getRoomLineupGroups(event).map((room) => (
                            <div
                              key={room.id}
                              className="grid items-center gap-x-2 gap-y-2 md:grid-cols-[7rem_minmax(0,1fr)]"
                            >
                              <p
                                className="shrink-0 text-body uppercase tracking-widerish"
                                style={{
                                  color: "var(--accent-hex)",
                                  fontFamily: "var(--font-space-grotesk)",
                                }}
                              >
                                {room.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                {room.entries.map((entry) => (
                                  <span
                                    key={entry.id}
                                    className="inline-flex min-h-[1.4rem] items-center rounded-[0.35rem] border border-border bg-panel px-3 py-[0.08rem] leading-none text-body-sm text-white/78"
                                    style={{ lineHeight: 1 }}
                                  >
                                    {entry.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-body-sm text-muted">Lineup by room will appear here once rooms are assigned.</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {event.lineup.entries.map((entry) => (
                          <span
                            key={entry.id}
                            className="inline-flex min-h-[1.4rem] items-center rounded-[0.35rem] border border-border bg-panel px-3 py-[0.08rem] leading-none text-body-sm text-white/78"
                            style={{ lineHeight: 1 }}
                          >
                            {entry.name}
                          </span>
                        ))}
                      </div>
                    )}
	                </div>

	                <div className="space-y-1 pt-1">
	                  <p className="text-body-lg uppercase tracking-widerish text-[#FFFFFF]">
	                    Genres
	                  </p>
                    {event.cover.genreDisplayMode === "room" ? (
                      <div className="space-y-2">
                        {getRoomGenreGroups(event).length > 0 ? (
                          getRoomGenreGroups(event).map((room) => (
                            <div
                              key={room.id}
                              className="grid items-center gap-x-2 gap-y-2 md:grid-cols-[7rem_minmax(0,1fr)]"
                            >
                              <p
                                className="shrink-0 text-body uppercase tracking-widerish"
                                style={{
                                  color: "var(--accent-hex)",
                                  fontFamily: "var(--font-space-grotesk)",
                                }}
                              >
                                {room.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 text-body-sm text-[#FFFFFF]">
                                {room.genres.map((genre, index) => (
                                  <span key={`${room.id}-${genre}`} className="inline-flex items-center gap-3">
                                    {index > 0 ? (
                                      <span className="text-white/40">|</span>
                                    ) : null}
                                    <span>{genre}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-body-sm text-muted">Genres by room will appear here once rooms have their own styles assigned.</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3 text-body-sm text-[#FFFFFF]">
                        {event.cover.genres.map((genre, index) => (
                          <span key={genre} className="inline-flex items-center gap-3">
                            {index > 0 ? (
                              <span className="text-white/40">|</span>
                            ) : null}
                            <span>{genre}</span>
                          </span>
                        ))}
                      </div>
                    )}
	                </div>

	                <div className="space-y-1 pt-1">
	                  <p className="text-body-lg uppercase tracking-widerish text-[#FFFFFF]">Promoters</p>
                    <div
                      className={
                        promoters.length > 3
                          ? "grid gap-3 sm:grid-cols-2"
                          : "flex flex-col gap-2"
                      }
                    >
                      {promoters.map((promoter) =>
                        promoter.profileSlug ? (
                          <Link
                            key={promoter.id}
                            href={
                              audience === "recruiter"
                                ? `/recprofile/${promoter.profileSlug}`
                                : `/cons/profile/${promoter.profileSlug}`
                            }
                            className="inline-flex items-center gap-2 text-body text-fg transition hover:text-[var(--accent-hex)]"
                          >
                            <span className="h-6 w-6 overflow-hidden rounded-full border border-border bg-panel">
                              {promoter.avatarImageUrl ? (
                                <span
                                  className="block h-full w-full bg-cover bg-center"
                                  style={{
                                    backgroundImage: `url(${promoter.avatarImageUrl})`,
                                  }}
                                />
                              ) : null}
                            </span>
                            <span>{promoter.name}</span>
                          </Link>
                        ) : (
                          <span
                            key={promoter.id}
                            className="inline-flex items-center gap-2 text-body text-fg"
                          >
                            <span className="h-6 w-6 rounded-full border border-border bg-panel" />
                            <span>{promoter.name}</span>
                          </span>
                        ),
                      )}
                    </div>
	                </div>

	              </div>
	            </div>
          </section>

          {showCuratedAccessPanel ? (
            <section className="rounded-[var(--radius-surface)] border border-border bg-panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-heading-sm uppercase tracking-widerish text-[var(--accent-hex)]">
                    Curated Access
                  </p>
                  <p className="max-w-[40rem] text-body-sm text-white/78">
                    This event uses application-based access. Once approved, you will unlock all ticket sections available for your assigned access group.
                  </p>
                </div>

                {currentAssignment ? (
                  <div className="text-right">
                    <p className="text-body text-fg">Application approved</p>
                    <p className="mt-1 text-body-sm text-muted">
                      Your assigned access is active for this event.
                    </p>
                  </div>
                ) : currentApplication?.status === "pending" ? (
                  <div className="text-right">
                    <p className="text-body text-fg">Application pending</p>
                    <p className="mt-1 text-body-sm text-muted">
                      Recruiter review is still in progress.
                    </p>
                  </div>
                ) : currentApplication?.status === "denied" ? (
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-body text-fg">Application denied</p>
                      <p className="mt-1 text-body-sm text-muted">
                        You can submit a new application if the event is still open.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-4 text-body-sm uppercase tracking-[0.12em]"
                      style={{ color: "var(--accent-hex)" }}
                      onClick={() => setShowApplyDialog(true)}
                    >
                      Apply Again
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-4 text-body-sm uppercase tracking-[0.12em]"
                    style={{ color: "var(--accent-hex)" }}
                    onClick={() => setShowApplyDialog(true)}
                  >
                    Apply
                  </Button>
                )}
              </div>
            </section>
          ) : null}

          {showTicketsSection ? (
            <section id="tickets" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-heading-sm uppercase tracking-widerish text-[var(--accent-hex)]">
                    Tickets
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {visibleTicketSections.map((section) => (
                  <TicketSectionBlock
                    key={section.id}
                    section={section}
                    onPurchase={(sectionId) => {
                      if (audience !== "consumer" || !currentConsumer) {
                        return;
                      }

                      purchaseTicketSection({
                        eventId: event.id,
                        userId: currentConsumer.id,
                        sectionId,
                        quantity: 1,
                      });
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {relatedEvents.length > 0 ? (
            <section className="space-y-4">
              <div>
                <p className="text-heading-sm uppercase tracking-widerish text-[var(--accent-hex)]">
                  More From {recruiter.displayName}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {relatedEvents.map((relatedEvent) => (
                  <EventFeedCard
                    key={relatedEvent.id}
                    event={relatedEvent}
                    recruiter={recruiter}
                    audience={audience}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>

      {showApplyDialog && event.admissionMode === "curated" && currentConsumer ? (
        <ConfirmDialog
          title="Apply To Event"
          message="Submit your application for this curated event? If approved, you will be assigned to an access group and then see the ticket sections available for that group."
          confirmLabel="Apply"
          confirmTone="accent"
          hideClose
          titleColor="var(--accent-hex)"
          cancelButtonClassName="text-muted"
          confirmButtonClassName="text-[var(--accent-hex)]"
          onClose={() => setShowApplyDialog(false)}
          onConfirm={() => {
            applyToCuratedEvent({
              eventId: event.id,
              userId: currentConsumer.id,
            });
            setShowApplyDialog(false);
          }}
        />
      ) : null}
    </div>
  );
}
