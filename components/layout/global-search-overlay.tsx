"use client";

import { useEffect, useMemo, useState } from "react";
import type { Event } from "@/types/event";
import { formatCompactEventDate } from "@/lib/utils/date";

type SearchNightclub = {
  id: string;
  name: string;
  slug: string;
  avatarImageUrl?: string;
};

type SearchLabel = {
  id: string;
  name: string;
  avatarImageUrl?: string;
  href?: string;
};

type GlobalSearchOverlayProps = {
  open: boolean;
  onClose: () => void;
  events: Event[];
  nightclubs: SearchNightclub[];
  labels: SearchLabel[];
  eventHrefFor: (event: Event) => string;
  nightclubHrefFor: (nightclub: SearchNightclub) => string;
  onNavigate: (href: string) => void;
};

function formatEventSearchDate(date: string) {
  if (!date) {
    return "";
  }

  return formatCompactEventDate(date);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function scoreMatch(query: string, fields: string[]) {
  let score = -1;

  for (const field of fields) {
    const normalizedField = normalize(field);
    if (!normalizedField) {
      continue;
    }

    if (normalizedField === query) {
      score = Math.max(score, 100);
      continue;
    }

    if (normalizedField.startsWith(query)) {
      score = Math.max(score, 80);
      continue;
    }

    if (normalizedField.includes(query)) {
      score = Math.max(score, 60);
    }
  }

  return score;
}

export function GlobalSearchOverlay({
  open,
  onClose,
  events,
  nightclubs,
  labels,
  eventHrefFor,
  nightclubHrefFor,
  onNavigate,
}: GlobalSearchOverlayProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  const results = useMemo(() => {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      return {
        events: [] as Array<{
          id: string;
          title: string;
          dateLabel: string;
          subtitle: string;
          href: string;
        }>,
        pastEvents: [] as Array<{
          id: string;
          title: string;
          dateLabel: string;
          subtitle: string;
          href: string;
        }>,
        nightclubs: [] as Array<{
          id: string;
          name: string;
          avatarImageUrl?: string;
          href: string;
        }>,
        labels: [] as Array<{
          id: string;
          name: string;
          avatarImageUrl?: string;
          href?: string;
        }>,
      };
    }

    const matchedEvents = events
      .map((event) => {
        const lineupNames = event.lineup.entries.map((entry) => entry.name);
        const titleScore = scoreMatch(normalizedQuery, [event.cover.title]);
        const venueScore = scoreMatch(normalizedQuery, [event.cover.venue, event.cover.location]);
        const genreScore = scoreMatch(normalizedQuery, event.cover.genres);
        const labelScore = scoreMatch(
          normalizedQuery,
          (event.labels ?? []).map((label) => label.name),
        );
        const lineupScore = scoreMatch(normalizedQuery, lineupNames);
        const score = Math.max(titleScore, venueScore, genreScore, labelScore, lineupScore);

        if (score < 0) {
          return null;
        }

        const dateLabel = formatEventSearchDate(event.cover.date);
        const lineupLabel = lineupNames.join(", ");

        return {
          id: event.id,
          title: event.cover.title,
          dateLabel,
          subtitle: lineupLabel,
          href: eventHrefFor(event),
          status: event.status,
          score,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if ((right?.score ?? 0) !== (left?.score ?? 0)) {
          return (right?.score ?? 0) - (left?.score ?? 0);
        }

        return left!.title.localeCompare(right!.title);
      });

    const eventResults = matchedEvents
      .filter((event) => event!.status !== "past")
      .slice(0, 5)
      .map((event) => ({
        id: event!.id,
        title: event!.title,
        dateLabel: event!.dateLabel,
        subtitle: event!.subtitle,
        href: event!.href,
      }));

    const pastEventResults = matchedEvents
      .filter((event) => event!.status === "past")
      .slice(0, 5)
      .map((event) => ({
        id: event!.id,
        title: event!.title,
        dateLabel: event!.dateLabel,
        subtitle: event!.subtitle,
        href: event!.href,
      }));

    const nightclubResults = nightclubs
      .map((nightclub) => {
        const score = scoreMatch(normalizedQuery, [nightclub.name]);
        if (score < 0) {
          return null;
        }

        return {
          id: nightclub.id,
          name: nightclub.name,
          avatarImageUrl: nightclub.avatarImageUrl,
          href: nightclubHrefFor(nightclub),
          score,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if ((right?.score ?? 0) !== (left?.score ?? 0)) {
          return (right?.score ?? 0) - (left?.score ?? 0);
        }

        return left!.name.localeCompare(right!.name);
      })
      .slice(0, 8)
      .map((nightclub) => ({
        id: nightclub!.id,
        name: nightclub!.name,
        avatarImageUrl: nightclub!.avatarImageUrl,
        href: nightclub!.href,
      }));

    const labelResults = labels
      .map((label) => {
        const score = scoreMatch(normalizedQuery, [label.name]);
        if (score < 0) {
          return null;
        }

        return {
          id: label.id,
          name: label.name,
          avatarImageUrl: label.avatarImageUrl,
          href: label.href,
          score,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if ((right?.score ?? 0) !== (left?.score ?? 0)) {
          return (right?.score ?? 0) - (left?.score ?? 0);
        }

        return left!.name.localeCompare(right!.name);
      })
      .slice(0, 8)
      .map((label) => ({
        id: label!.id,
        name: label!.name,
        avatarImageUrl: label!.avatarImageUrl,
        href: label!.href,
      }));

    return {
      events: eventResults,
      pastEvents: pastEventResults,
      nightclubs: nightclubResults,
      labels: labelResults,
    };
  }, [eventHrefFor, events, nightclubHrefFor, nightclubs, labels, query]);

  if (!open) {
    return null;
  }

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  const defaultEvents = [...events]
    .filter((event) => Boolean(event.cover.date) && event.status !== "past")
    .sort((left, right) => new Date(left.cover.date).getTime() - new Date(right.cover.date).getTime())
    .slice(0, 5)
    .map((event) => ({
      id: event.id,
      title: event.cover.title,
      dateLabel: formatEventSearchDate(event.cover.date),
      subtitle: event.lineup.entries.map((entry) => entry.name).join(", "),
      href: eventHrefFor(event),
    }));

  const defaultPastEvents = [...events]
    .filter((event) => Boolean(event.cover.date) && event.status === "past")
    .sort((left, right) => new Date(right.cover.date).getTime() - new Date(left.cover.date).getTime())
    .slice(0, 5)
    .map((event) => ({
      id: event.id,
      title: event.cover.title,
      dateLabel: formatEventSearchDate(event.cover.date),
      subtitle: event.lineup.entries.map((entry) => entry.name).join(", "),
      href: eventHrefFor(event),
    }));

  const defaultNightclubs = nightclubs.slice(0, 6).map((nightclub) => ({
    id: nightclub.id,
    name: nightclub.name,
    avatarImageUrl: nightclub.avatarImageUrl,
    href: nightclubHrefFor(nightclub),
  }));

  const defaultLabels = [...labels]
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, 8);

  const displayEvents = query.trim().length === 0 ? defaultEvents : results.events;
  const displayPastEvents = query.trim().length === 0 ? defaultPastEvents : results.pastEvents;
  const displayNightclubs = query.trim().length === 0 ? defaultNightclubs : results.nightclubs;
  const displayLabels = query.trim().length === 0 ? defaultLabels : results.labels;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 px-4 py-4 md:px-6 md:py-6" onClick={handleClose}>
      <div
        className="mx-auto flex h-[calc(100vh-2rem)] w-full max-w-[92rem] flex-col rounded-[var(--radius-surface)] border border-border bg-panel px-5 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.36)] md:h-[calc(100vh-3rem)] md:px-6 md:py-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events, clubs, labels, DJs"
            className="h-10 w-full border-none bg-transparent px-0 text-subheading font-light tracking-[0.05em] text-fg outline-none placeholder:text-subheading placeholder:text-muted"
          />
          <button
            type="button"
            className="shrink-0 text-subheading uppercase tracking-widerish transition"
            style={{ color: "var(--accent-hex)" }}
            onClick={handleClose}
          >
            X
          </button>
        </div>

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
          {query.trim().length !== 0 &&
          displayEvents.length === 0 &&
          displayPastEvents.length === 0 &&
          displayNightclubs.length === 0 &&
          displayLabels.length === 0 ? (
            <p className="text-body text-muted">No results found.</p>
          ) : (
            <div className="space-y-8">
              <section className="space-y-3">
                <h3 className="text-body-sm uppercase tracking-widerish text-[var(--accent-hex)]">Events</h3>
                {displayEvents.length > 0 ? (
                  <div className="space-y-1.5">
                    {displayEvents.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => {
                          setQuery("");
                          onNavigate(result.href);
                        }}
                        className="block w-full rounded-[var(--radius-button-tag)] border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-panel-2"
                      >
                        <div className="truncate text-body text-fg">{result.title}</div>
                        <div className="flex items-baseline gap-1.5 text-body-sm text-muted">
                          <div className="shrink-0">{result.dateLabel}</div>
                          <div className="shrink-0 text-white/50">|</div>
                          <div className="truncate">{result.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-sm text-muted">No matching events.</p>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-body-sm uppercase tracking-widerish text-[var(--accent-hex)]">Nightclubs</h3>
                {displayNightclubs.length > 0 ? (
                  <div className="space-y-1.5">
                    {displayNightclubs.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => {
                          setQuery("");
                          onNavigate(result.href);
                        }}
                        className="flex w-full items-center gap-3 rounded-[var(--radius-button-tag)] border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-panel-2"
                      >
                        <span className="h-9 w-9 overflow-hidden rounded-full border border-border bg-panel">
                          {result.avatarImageUrl ? (
                            <span
                              className="block h-full w-full bg-cover bg-center"
                              style={{ backgroundImage: `url(${result.avatarImageUrl})` }}
                            />
                          ) : null}
                        </span>
                        <span className="truncate text-body text-fg">{result.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-sm text-muted">No matching nightclubs.</p>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-body-sm uppercase tracking-widerish text-[var(--accent-hex)]">Labels</h3>
                {displayLabels.length > 0 ? (
                  <div className="space-y-1.5">
                    {displayLabels.map((result) => {
                      const content = (
                        <>
                          <span className="h-9 w-9 overflow-hidden rounded-full border border-border bg-panel">
                            {result.avatarImageUrl ? (
                              <span
                                className="block h-full w-full bg-cover bg-center"
                                style={{ backgroundImage: `url(${result.avatarImageUrl})` }}
                              />
                            ) : null}
                          </span>
                          <span className={`truncate text-body ${result.href ? "text-fg" : "text-white/78"}`}>
                            {result.name}
                          </span>
                        </>
                      );

                      return result.href ? (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => {
                            setQuery("");
                            onNavigate(result.href!);
                          }}
                          className="flex w-full items-center gap-3 rounded-[var(--radius-button-tag)] border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-panel-2"
                        >
                          {content}
                        </button>
                      ) : (
                        <div
                          key={result.id}
                          className="flex w-full items-center gap-3 rounded-[var(--radius-button-tag)] border border-transparent px-3 py-2 text-left"
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-body-sm text-muted">No matching labels.</p>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-body-sm uppercase tracking-widerish text-[var(--accent-hex)]">Past Events</h3>
                {displayPastEvents.length > 0 ? (
                  <div className="space-y-1.5">
                    {displayPastEvents.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => {
                          setQuery("");
                          onNavigate(result.href);
                        }}
                        className="block w-full rounded-[var(--radius-button-tag)] border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-panel-2"
                      >
                        <div className="truncate text-body text-fg">{result.title}</div>
                        <div className="flex items-baseline gap-1.5 text-body-sm text-muted">
                          <div className="shrink-0">{result.dateLabel}</div>
                          <div className="shrink-0 text-white/50">|</div>
                          <div className="truncate">{result.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-sm text-muted">No matching past events.</p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
