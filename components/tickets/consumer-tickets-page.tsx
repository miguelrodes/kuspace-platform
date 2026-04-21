"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PublicTopNav } from "@/components/layout/public-top-nav";
import { Button } from "@/components/ui/button";
import {
  getConsumerTicketStatus,
  getEventAccessAssignment,
} from "@/lib/event-access";
import { canConsumerAccessEvent } from "@/lib/event-status";
import { useMockEventsStore } from "@/lib/mock-store";
import { formatFullEventDate } from "@/lib/utils/date";
import type { ConsumerTicketStatus, ConsumerTicketWalletEntry } from "@/types/user";

type TicketSection = "upcoming" | "past";

function formatEventDate(date: string) {
  return formatFullEventDate(date);
}

function formatPaymentStateLabel(paymentState: "not_required" | "pending" | "paid" | "waived") {
  return paymentState
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTicketStatusLabel(status: ConsumerTicketStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getTicketStatusTone(status: ConsumerTicketStatus) {
  switch (status) {
    case "active":
      return "text-fg";
    case "scanned":
      return "text-muted";
    case "inactive":
    default:
      return "text-muted";
  }
}

function TicketDetailModal({
  eventTitle,
  eventSlug,
  date,
  venue,
  tickets,
  onClose,
}: {
  eventTitle: string;
  eventSlug: string;
  date: string;
  venue: string;
  tickets: Array<{
    quantity: number;
    groupName: string;
    ticketLabel?: string;
    paymentState: "not_required" | "pending" | "paid" | "waived";
    status: ConsumerTicketStatus;
  }>;
  onClose: () => void;
}) {
  const qrPattern = (ticketIndex: number) =>
    Array.from({ length: 21 * 21 }, (_, cellIndex) => {
      const row = Math.floor(cellIndex / 21);
      const col = cellIndex % 21;

      const inFinder =
        ((row < 7 && col < 7) || (row < 7 && col >= 14) || (row >= 14 && col < 7));

      if (inFinder) {
        const localRow = row % 7;
        const localCol = col % 7;
        const border = localRow === 0 || localRow === 6 || localCol === 0 || localCol === 6;
        const center = localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4;
        return border || center;
      }

      if (row === 6 || col === 6) {
        return (row + col + ticketIndex) % 2 === 0;
      }

      return ((row * 3 + col * 5 + ticketIndex * 7) % 11) < 5;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-[var(--radius-surface)] border border-border bg-panel p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="max-h-[72vh] overflow-y-auto pr-1">
          <div className="space-y-4">
            {tickets.flatMap((ticket, ticketGroupIndex) =>
              Array.from({ length: ticket.quantity }).map((_, ticketIndex) => {
                const qrIndexSeed = ticketGroupIndex * 100 + ticketIndex;
                return (
                  <div
                    key={`${eventSlug}-${ticket.groupName}-${ticketIndex + 1}`}
                    className="rounded-[var(--radius-surface)] border border-border bg-panel p-4"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 border-b border-border pb-2">
                      <div className="min-w-0 self-start">
                        <p className="text-heading-sm text-fg">{eventTitle}</p>
                      </div>

                      <div className="text-right self-start">
                        <p className="text-body text-fg">{date}</p>
                      </div>

                      <div className="min-w-0 flex h-6 items-center">
                        <p className="text-body text-muted">
                          {ticket.groupName}
                          {ticket.ticketLabel && ticket.ticketLabel !== ticket.groupName
                            ? ` • ${ticket.ticketLabel}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex h-6 items-center justify-end text-right">
                        <p className="text-body-sm text-muted">{venue}</p>
                      </div>
                    </div>

                    <div className="pt-4">
                      {ticket.status === "active" ? (
                        <div className="mx-auto aspect-square w-full max-w-[18rem] rounded-[var(--radius-button-tag)] bg-white p-3">
                          <div className="grid h-full w-full grid-cols-[repeat(21,minmax(0,1fr))] gap-px bg-white">
                            {qrPattern(qrIndexSeed).map((dark, qrIndex) => (
                              <span
                                key={qrIndex}
                                className={dark ? "bg-black" : "bg-white"}
                              />
                            ))}
                          </div>
                        </div>
                      ) : ticket.status === "scanned" ? (
                        <div className="mx-auto flex aspect-square w-full max-w-[18rem] items-center justify-center rounded-[var(--radius-button-tag)] border border-border bg-panel px-6 text-center">
                          <div className="space-y-2">
                            <p className="text-body text-fg">Ticket scanned</p>
                            <p className="text-body-sm text-muted">
                              This ticket has already been used and can no longer be scanned.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mx-auto flex aspect-square w-full max-w-[18rem] items-center justify-center rounded-[var(--radius-button-tag)] border border-border bg-panel px-6 text-center">
                          <div className="space-y-2">
                            <p className="text-body text-fg">QR inactive</p>
                            <p className="text-body-sm text-muted">
                              This ticket will activate once payment is completed or waived.
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-body-sm uppercase tracking-widerish text-muted">
                          {ticket.status === "active"
                            ? `Active • ${ticket.groupName}`
                            : ticket.status === "scanned"
                              ? `Scanned • ${ticket.groupName}`
                              : `Inactive • Payment ${formatPaymentStateLabel(ticket.paymentState)}`}
                        </p>
                        <Link
                          href={`/cons/events/${eventSlug}`}
                          className="text-body-sm transition hover:opacity-80"
                          style={{ color: "var(--accent-hex)" }}
                        >
                          Open event page
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketEventRow({
  quantity,
  event,
  paymentState,
  status,
  onViewTicket,
}: {
  quantity: number;
  event: ReturnType<typeof useMockEventsStore>["events"][number];
  paymentState: "not_required" | "pending" | "paid" | "waived";
  status: ConsumerTicketStatus;
  onViewTicket: () => void;
}) {
  const isPast = event.status === "past";
  const lineupPreview = event.lineup.entries.map((entry) => entry.name).join(", ");

  return (
    <div className={`border-b border-border py-4 transition ${isPast ? "opacity-65" : ""}`}>
      <div className="hidden items-center gap-4 md:grid md:grid-cols-[9rem_minmax(0,1.18fr)_minmax(0,0.82fr)_6.5rem_10rem]">
        <div className="text-body-sm uppercase tracking-[0.06em] text-muted">
          {formatEventDate(event.cover.date)}
        </div>

        <div className="min-w-0">
          <Link href={`/cons/events/${event.slug}`} className="block transition hover:opacity-90">
            <p className="truncate text-lg text-fg">{event.cover.title}</p>
          </Link>
          <p className="mt-1 max-w-[19rem] truncate text-body-sm text-muted">
            {lineupPreview}
          </p>
        </div>

        <div className="min-w-0">
          <p className="truncate text-body text-fg">{event.cover.venue}</p>
          <p className="truncate text-body-sm text-muted">{event.cover.location}</p>
        </div>

        <div className="min-w-0 justify-self-start -ml-6">
          <div className="flex items-center gap-2 whitespace-nowrap">
          <span
            className="inline-flex min-w-5 items-center justify-center text-body"
            style={{ color: "var(--warning-hex)" }}
          >
            {quantity}
          </span>
          <span className={`text-body-sm ${getTicketStatusTone(status)}`}>
            {status === "inactive"
              ? `Inactive • Payment ${formatPaymentStateLabel(paymentState)}`
              : formatTicketStatusLabel(status)}
          </span>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            className="h-8 border border-border px-3 text-body-sm uppercase tracking-[0.1em] hover:bg-panel-2"
            style={{ color: "var(--accent-hex)" }}
            onClick={onViewTicket}
          >
            View Ticket
          </Button>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body-sm uppercase tracking-[0.06em] text-muted">
              {formatEventDate(event.cover.date)}
            </p>
            <Link href={`/cons/events/${event.slug}`} className="block transition hover:opacity-90">
              <p className="mt-1 text-lg text-fg">{event.cover.title}</p>
            </Link>
            <p className="mt-1 max-w-[16rem] truncate text-body-sm text-muted">
              {lineupPreview}
            </p>
          </div>
          <div
            className="flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-button-tag)] border border-border bg-panel px-2 text-subheading"
            style={{ color: "var(--warning-hex)" }}
          >
            {quantity}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-body text-fg">{event.cover.venue}</p>
          <p className="text-body-sm text-muted">{event.cover.location}</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex min-w-5 items-center justify-center text-body"
              style={{ color: "var(--warning-hex)" }}
            >
              {quantity}
            </span>
            <span className={`text-body-sm ${getTicketStatusTone(status)}`}>
              {status === "inactive"
                ? `Inactive • Payment ${formatPaymentStateLabel(paymentState)}`
                : formatTicketStatusLabel(status)}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-8 border border-border px-3 text-body-sm uppercase tracking-[0.1em] hover:bg-panel-2"
            style={{ color: "var(--accent-hex)" }}
            onClick={onViewTicket}
          >
            View Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}

function TicketSectionBlock({
  entries,
  onViewTicket,
  sortDirection,
}: {
  entries: Array<{
    entry: ConsumerTicketWalletEntry;
    event: ReturnType<typeof useMockEventsStore>["events"][number];
    groupName: string;
    paymentState: "not_required" | "pending" | "paid" | "waived";
    status: ConsumerTicketStatus;
  }>;
  onViewTicket: (eventSlug: string) => void;
  sortDirection: "asc" | "desc";
}) {
  const groupedEntries = Array.from(
    entries.reduce((groups, entry) => {
      const existing = groups.get(entry.event.slug);

      if (existing) {
        existing.quantity += entry.entry.quantity;
        if (entry.status === "active" || existing.status === "active") {
          existing.status = "active";
        } else if (entry.status === "inactive" || existing.status === "inactive") {
          existing.status = "inactive";
        } else {
          existing.status = "scanned";
        }
        return groups;
      }

      groups.set(entry.event.slug, {
        event: entry.event,
        quantity: entry.entry.quantity,
        paymentState: entry.paymentState,
        status: entry.status,
      });

      return groups;
    }, new Map<string, {
      event: ReturnType<typeof useMockEventsStore>["events"][number];
      quantity: number;
      paymentState: "not_required" | "pending" | "paid" | "waived";
      status: ConsumerTicketStatus;
    }>()).values(),
  );

  const sortedEntries = [...groupedEntries].sort((left, right) => {
    const leftTime = new Date(`${left.event.cover.date}T00:00:00.000Z`).getTime();
    const rightTime = new Date(`${right.event.cover.date}T00:00:00.000Z`).getTime();

    if (leftTime !== rightTime) {
      return sortDirection === "asc" ? leftTime - rightTime : rightTime - leftTime;
    }

    return left.event.slug.localeCompare(right.event.slug);
  });

  return (
    <section className="space-y-2.5">
      <div className="hidden grid-cols-[9rem_minmax(0,1.18fr)_minmax(0,0.82fr)_6.5rem_10rem] gap-4 px-4 text-body-sm uppercase tracking-widerish text-muted md:grid">
        <div>Event date</div>
        <div>Event title</div>
        <div>Location</div>
        <div className="-ml-6">Tickets</div>
        <div />
      </div>

      {entries.length === 0 ? (
        <div className="rounded-[var(--radius-surface)] border border-dashed border-border bg-panel px-4 py-5">
          <p className="text-body text-muted">
            No tickets in this section yet.
          </p>
        </div>
      ) : (
        <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-4">
          {sortedEntries.map(({ event, quantity, paymentState, status }) => (
            <TicketEventRow
              key={event.slug}
              quantity={quantity}
              event={event}
              paymentState={paymentState}
              status={status}
              onViewTicket={() => onViewTicket(event.slug)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function ConsumerTicketsPage() {
  const { users, events, getCurrentConsumerUser } = useMockEventsStore();
  const [activeSection, setActiveSection] = useState<TicketSection>("upcoming");
  const [selectedEntrySlug, setSelectedEntrySlug] = useState<string | null>(null);

  const currentUser = getCurrentConsumerUser();
  const ticketEntries = useMemo(
    () => currentUser?.ticketWalletEntries ?? [],
    [currentUser?.ticketWalletEntries],
  );

  const ticketCards = useMemo(
    () =>
      ticketEntries
        .map((entry) => {
          const event = events.find((candidate) => candidate.slug === entry.eventSlug);
          if (!event) {
            return null;
          }

          const assignment = currentUser
            ? getEventAccessAssignment(event, currentUser.id)
            : undefined;

          const groupName =
            event.guestlist.accessGroups.find(
              (group) => group.id === entry.accessGroupId,
            )?.name ??
            "Regular Entry";

          return {
            entry,
            event,
            groupName,
            paymentState: assignment?.paymentState ?? "pending",
            status: getConsumerTicketStatus({
              walletStatus: entry.status,
              assignment,
            }),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .sort((left, right) => {
          const leftTime = new Date(`${left.event.cover.date}T00:00:00.000Z`).getTime();
          const rightTime = new Date(`${right.event.cover.date}T00:00:00.000Z`).getTime();
          return leftTime - rightTime;
        }),
    [currentUser?.id, events, ticketEntries],
  );

  const upcomingCards = ticketCards
    .filter(({ event }) => event.status === "live" && canConsumerAccessEvent(event))
    .sort((left, right) => {
      const leftTime = new Date(`${left.event.cover.date}T00:00:00.000Z`).getTime();
      const rightTime = new Date(`${right.event.cover.date}T00:00:00.000Z`).getTime();
      return leftTime - rightTime;
    });
  const pastCards = ticketCards
    .filter(({ event }) => event.status === "past" && canConsumerAccessEvent(event))
    .sort((left, right) => {
      const leftTime = new Date(`${left.event.cover.date}T00:00:00.000Z`).getTime();
      const rightTime = new Date(`${right.event.cover.date}T00:00:00.000Z`).getTime();
      return rightTime - leftTime;
    });

  const activeCards = activeSection === "upcoming" ? upcomingCards : pastCards;

  const selectedCards = selectedEntrySlug
    ? ticketCards.filter(({ event }) => event.slug === selectedEntrySlug)
    : [];
  const selectedCard = selectedCards[0] ?? null;
  const isHydrating = users.length === 0;

  return (
    <div className="min-h-screen bg-bg text-fg">
      <PublicTopNav title="Nightlife Ops System" subtitle="Clubs, Brands, Collectives" />

      <main className="px-4 py-8 md:px-6 md:py-8">
        <div className="mx-auto max-w-7xl">
          <section className="rounded-[var(--radius-surface)] border border-border bg-panel px-5 pb-6 pt-2 md:px-6 md:pb-8 md:pt-2.5">
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <h1
                  className="text-heading uppercase"
                  style={{
                    color: "var(--accent-hex)",
                    fontFamily: "var(--font-space-grotesk)",
                    letterSpacing: "0.06em",
                  }}
                >
                  Tickets
                </h1>

                <div className="inline-flex translate-x-4 items-end gap-2 self-end">
                  {(["upcoming", "past"] as const).map((item, index) => (
                    <div key={item} className="inline-flex items-end gap-2">
                      {index > 0 ? (
                        <span className="pb-[1px] text-lg uppercase tracking-widerish leading-none text-white">
                          |
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setActiveSection(item)}
                        className={[
                          "h-auto rounded-[var(--radius-button-tag)] px-2.5 pb-0 pt-0 text-lg uppercase tracking-widerish leading-none transition",
                          activeSection === item
                            ? "bg-transparent text-white"
                            : "text-muted hover:text-fg",
                        ].join(" ")}
                      >
                        {item}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <TicketSectionBlock
                entries={activeCards}
                onViewTicket={setSelectedEntrySlug}
                sortDirection={activeSection === "upcoming" ? "asc" : "desc"}
              />

              {isHydrating ? (
                <div className="rounded-[var(--radius-surface)] border border-dashed border-border bg-panel px-4 py-5">
                  <p className="text-body text-muted">Loading tickets…</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {selectedCard ? (
        <TicketDetailModal
          eventTitle={selectedCard.event.cover.title}
          eventSlug={selectedCard.event.slug}
          date={formatEventDate(selectedCard.event.cover.date)}
          venue={selectedCard.event.cover.venue}
          tickets={selectedCards.map((card) => ({
            quantity: card.entry.quantity,
            groupName: card.groupName,
            ticketLabel: card.entry.ticketLabel,
            paymentState: card.paymentState,
            status: card.status,
          }))}
          onClose={() => setSelectedEntrySlug(null)}
        />
      ) : null}
    </div>
  );
}
