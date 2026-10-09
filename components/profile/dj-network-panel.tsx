"use client";

import { useMemo, useState } from "react";
import type { Event } from "@/types/event";
import { Input } from "@/components/ui/input";

type DJNetworkPanelProps = {
  events: Event[];
};

export function DJNetworkPanel({ events }: DJNetworkPanelProps) {
  const [query, setQuery] = useState("");

  const artists = useMemo(() => {
    const uniqueArtists = Array.from(
      new Set(
        events.flatMap((event) =>
          event.lineup.entries
            .map((entry) => entry.name)
            .filter((name) => name !== "TBA")
        )
      )
    ).sort((a, b) => a.localeCompare(b));

    if (!query.trim()) {
      return uniqueArtists;
    }

    return uniqueArtists.filter((artist) =>
      artist.toLowerCase().includes(query.toLowerCase())
    );
  }, [events, query]);

  return (
    <div className="space-y-2 px-4 py-4">
      <div className="space-y-3">
        <h2
          className="relative top-[2px] whitespace-nowrap text-left text-lg uppercase tracking-[0.01em]"
          style={{ color: "#FFFFFF", fontFamily: "var(--font-space-grotesk)" }}
        >
          Artists Performed
        </h2>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search artists"
          className="!h-7 max-w-[11rem] px-2.5 text-body-sm"
        />
      </div>

      {artists.length === 0 ? (
        <p className="text-body-sm text-muted">No artists match this search.</p>
      ) : (
        <div className="max-h-[41rem] space-y-1 overflow-y-auto pr-2 text-sm text-muted">
          {artists.map((artist, index) => (
            <p
              key={artist}
              className="profile-content-reveal profile-artist-reveal"
              style={{ animationDelay: `${400 + Math.min(index * 25, 200)}ms` }}
            >
              {artist}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
