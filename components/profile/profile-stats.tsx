import Link from "next/link";
import type { RecruiterProfile } from "@/types/profile";
import { MetaTag } from "@/components/ui/meta-tag";

type ProfileStatsProps = {
  profile: RecruiterProfile;
};

function formatFollowers(value?: number) {
  if (!value) {
    return "0";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

export function ProfileStats({ profile }: ProfileStatsProps) {
  const soundProfile = profile.soundProfile;
  const stats = profile.stats;
  const links = profile.links;

  return (
    <div className="space-y-7">
      <div className="space-y-1 text-body">
        <div className="grid grid-cols-[5rem_1fr] items-baseline gap-x-3">
          <p style={{ color: "#FFFFFF" }}>Followers:</p>
          <p style={{ color: "#FFFFFF" }}>
            {formatFollowers(stats?.followers)}
          </p>
        </div>
        <div className="grid grid-cols-[5rem_1fr] items-baseline gap-x-3">
          <p style={{ color: "#FFFFFF" }}>Rating:</p>
          <p style={{ color: "#FFFFFF" }}>
            {stats?.publicRating?.toFixed(1) ?? "0.0"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p
          className="text-subheading uppercase tracking-tightish"
          style={{ color: "#FFFFFF" }}
        >
          Sound Profile
        </p>
        <div className="flex flex-wrap items-start gap-2 pl-0">
          {soundProfile?.genres.map((genre) => (
            <MetaTag key={genre}>{genre}</MetaTag>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p
          className="text-subheading uppercase tracking-tightish"
          style={{ color: "#FFFFFF" }}
        >
          Rooms
        </p>
        <div className="space-y-1 text-body-sm text-muted">
          {soundProfile?.rooms?.map((room) => (
            <div
              key={room.name}
              className="grid grid-cols-[5.75rem_4.5rem] items-baseline gap-x-3"
            >
              <p>{room.name}</p>
              <p
                className="text-left"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {room.capacity.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p
          className="text-subheading uppercase tracking-tightish"
          style={{ color: "#FFFFFF" }}
        >
          Links
        </p>
        <div className="space-y-1 text-body text-muted">
          {links?.instagram ? (
            <Link href={links.instagram} className="block transition hover:text-fg">
              Instagram
            </Link>
          ) : null}
          {links?.residentAdvisor ? (
            <Link
              href={links.residentAdvisor}
              className="block transition hover:text-fg"
            >
              Resident Advisor
            </Link>
          ) : null}
          {links?.website ? (
            <Link href={links.website} className="block transition hover:text-fg">
              Website
            </Link>
          ) : null}
          {links?.mapsLocation ? (
            <Link
              href={links.mapsLocation}
              className="block transition hover:text-fg"
            >
              Maps
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
