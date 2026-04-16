import type { Event } from "@/types/event";

export type RecruiterType = "nightclub" | "label";

export type RecruiterProfileLinks = {
  instagram?: string;
  soundcloud?: string;
  spotify?: string;
  residentAdvisor?: string;
  website?: string;
  email?: string;
  mapsLocation?: string;
};

export type RecruiterSoundProfile = {
  genres: string[];
  roomSize?: number;
  roomCount?: number;
  rooms?: Array<{
    name: string;
    capacity: number;
  }>;
};

export type RecruiterProfileStatKey =
  | "eventsHeld"
  | "citiesActive"
  | "followers"
  | "publicRating";

export type RecruiterProfileStatVisibility = Record<
  RecruiterProfileStatKey,
  boolean
>;

export type RecruiterProfileStats = {
  eventsHeld?: number;
  citiesActive?: number;
  followers?: number;
  publicRating?: number;
  display: RecruiterProfileStatVisibility;
};

// Lightweight event reference for profile surfaces until Event is modeled.
export type RecruiterProfileEventReference = {
  id: string;
  slug?: string;
  title?: string;
  startsAt?: string;
};

export type RecruiterProfileLocation = {
  displayText: string;
};

export type RecruiterProfileMedia = {
  avatarImageUrl?: string;
  bannerImageUrl?: string;
};

export interface RecruiterProfile {
  id: string;
  slug: string;
  recruiterType: RecruiterType;

  realName?: string;
  displayName: string;

  media?: RecruiterProfileMedia;
  bio?: string;
  location?: RecruiterProfileLocation;
  soundProfile?: RecruiterSoundProfile;
  links?: RecruiterProfileLinks;

  canFollow?: boolean;

  stats?: RecruiterProfileStats;

  events?: {
    upcoming?: Event[];
    past?: Event[];
  };
}
